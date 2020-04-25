#!/usr/bin/env node

require('dotenv').config()

const fetch = require('node-fetch')
const fs = require("fs")
const spawnSync = require('child_process').spawnSync

const GithubApi = "https://api.github.com"
const GithubAccessToken = process.env.GITHUB_ACCESS_TOKEN
const BackupS3Bucket = process.env.BACKUP_S3_BUCKET

const BackupGenration = 3
const LocalBackupPath = "/tmp/github.tar.gz"


const headers = {
   "Authorization": "token " + GithubAccessToken,
   "Content-Type": "application/json",
   "Accept": "application/vnd.github.wyandotte-preview+json"}


const listOwnerRepository =  async () => {
   const url = `${GithubApi}/user/repos?per_page=100&affiliation=owner`

   const response = await fetch(url, {headers})
   if (! response.ok) {
     console.log("Error: ", response)
   }
   const list = await response.json()
   const fullNames = list.filter(e => !e.fork).map(e => e.full_name)
   return fullNames
   // return fullNames.slice(0, 4)  // for DEBUG
}

const startMigration = async (fullNames) => {
   const method = "POST"
   const url = `${GithubApi}/user/migrations`
   const body = JSON.stringify({repositories: fullNames})

   const response = await fetch(url, {method, headers, body})
   if (! response.ok) {
     console.log("Error: ", response)
   }
   const migration = await response.json()
   return migration.id
}

const statusOfMigration =  async (id) => {
   const url = `${GithubApi}/user/migrations/${id}`

   const response = await fetch(url, {headers})
   if (! response.ok) {
     console.log("Error: ", response)
   }
   const mingration = await response.json()
   return mingration.state   // pending, exporting, exported, failed
}

const getMigrationArchive =  async (id) => {
   const url = `${GithubApi}/user/migrations/${id}/archive`

   const response = await fetch(url, {headers, redirect: "manual"})
   if (response.status != 302) {
     console.log("Error: ", response)
   }
   const archiveURL = await response.text()
   return archiveURL
}

const deleteMigrationArchive =  async (id) => {
   const method = "DELETE"
   const url = `${GithubApi}/user/migrations/${id}/archive`

   const response = await fetch(url, {method, headers})
   if (! response.ok) {
     console.log("Error: ", response)
   }
}

const downloadArchive =  (url, path) => {
   if (fs.existsSync(path)) { fs.unlinkSync(path) }

   const {status} = spawnSync(`curl -f -o ${path} "${url}"`, { stdio: 'inherit', shell: true })
   return status === 0
}

const backupRotaionNumber = () => {
   const t = new Date()
   const totalDays = Math.floor((t.getTime() - t.getTimezoneOffset() * 60 * 1000) / (1000*60*60*24))
   return totalDays % BackupGenration
}

const backupToS3 = (path) => {
   const s3path = `s3://${BackupS3Bucket}/backup${backupRotaionNumber()}/github.tar.gz`
   const {status} = spawnSync(`aws s3 cp ${path} ${s3path}`, { stdio: 'inherit', shell: true })
   return status === 0
}

const delay = (mSec) => new Promise((resolve) => setTimeout(resolve, mSec))

const githubBackup = async () => {
   console.log("-- Start GitHub backup")
   const fullNames = await listOwnerRepository()
   console.log(fullNames.join(','))
   const migrationId = await startMigration(fullNames)
   console.log("migrationId: " + migrationId)
   while (true) {
      const status = await statusOfMigration(migrationId)
      if (status == "exporting") {
         process.stdout.write(".")
      } else {
         console.log(status)
      }
      if (status == "exported") { break }
      if (status == "failed") { return false }
      await delay(10000)
   }

   const archiveUrl = await getMigrationArchive(migrationId)
   console.log("archiveUrl: " + archiveUrl)
   console.log("-- download Archive file")
   if (! downloadArchive(archiveUrl, LocalBackupPath)) { return false }
   console.log("-- copy Archive to S3")
   if (! backupToS3(LocalBackupPath)) { return false }
   await deleteMigrationArchive(migrationId)
   console.log("-- OK")
   return true
}

githubBackup()

/*

TODO: check backuped

aws s3 ls  s3://ey-office.net/backup2/
2020-04-22 10:25:41   82044492 github.tar.gz

* date
* size


1. get list of backup reposiroies
   * curl -s -H "Authorization: tokenXXXX" -H "Accept: application/vnd.github.wyandotte-preview+json" "https://api.github.com/user/repos?per_page=100&affiliation=owner,organization_member"
   * remove forks
2. start migration
3. check status for export done
4. get archive URL
5. download archive file -- curl command
6. copy archive file to S3 --- aws cp command
7. remove migration

*/
