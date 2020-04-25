#!/usr/bin/env node

require('dotenv').config()

const fetch = require('node-fetch')
const GithubApi = "https://api.github.com"
const GithubAccessToken = process.env.GITHUB_ACCESS_TOKEN
const GithubOwner = process.env.GITHUB_OWNER
const GithubPrivate = process.env.GITHUB_PRIVATE
const SourceGitUrl = process.env.SOURCE_GIT_URL
const SourceGitUser = process.env.SOURCE_GIT_USER
const SourceGitPassword = process.env.SOURCE_GIT_PASSWORD

const createRepository = async (orgs, name, description) => {
  const method = "POST"
  const url = orgs === GithubOwner ? `${GithubApi}/user/repos` : `${GithubApi}/orgs/${orgs}/repos`
  const headers = {"Authorization" : "token " + GithubAccessToken, "Content-Type": "application/json",
                   "Accept": "application/vnd.github.wyandotte-preview+json"}
  const body = JSON.stringify({name: name, description: description, private: GithubPrivate})
  console.log("-- create repo " + name)

  const response = await fetch(url, {method, headers, body})
  if (! response.ok) {
    console.log("Error: ", response)
    return false
  }
  return true
}

const startImportRepository = async (repoPath, ownerRepo) => {
  const method = "PUT"
  const url = `${GithubApi}/repos/${ownerRepo}/import`
  const headers = {"Authorization" : "token " + GithubAccessToken, "Content-Type": "application/json",
                   "Accept": "application/vnd.github.wyandotte-preview+json"}
  const body = JSON.stringify({
    vcs: "git",
    vcs_url: `${SourceGitUrl}/${repoPath}`,
    vcs_username: SourceGitUser,
    vcs_password: SourceGitPassword
  })
  const response = await fetch(url, {method, headers, body})
  if (!response.ok) {
    console.log("Error: ", response)
    return false
  }
  return true
}

const progressImportRepository = async (ownerRepo) => {
  const url = `${GithubApi}/repos/${ownerRepo}/import`
  const headers = {"Authorization" : "token " + GithubAccessToken, "Content-Type": "application/json"}

  const response = await fetch(url, {headers})
  if (! response.ok) {
    console.log("Error: ", response)
    return {status: "api_error"}
  }
  return  response.json()
}

const delay = (mSec) => new Promise((resolve) => setTimeout(resolve, mSec))

const importRepository = async (repoPath, orgs, name) => {
  const notDoneStatuses = {"detecting": 1, "importing": 1, "mapping": 1, "pushing": 1}
  const successStatus = "complete"

  const ownerRepo = orgs + "/" + name
  const ok = await startImportRepository(repoPath, ownerRepo)
  if (!ok) { return  false }

  while (true) {
    const progress = await progressImportRepository(ownerRepo)
    console.log("-- " + progress.status)
    if (notDoneStatuses[progress.status]) {
      await delay(10000)
    } else {
      if (progress.status != successStatus) {
        console.log("Error: ", progress)
      }
      return true
    }
  }
}

const main =  async() => {
  if (process.argv.length < 4) {
    console.log("Usage: repo_path org/repo [description]")
    process.exit(1)
  }

  const repoPath = process.argv[2]
  const [orgs, name] = process.argv[3].split("/")
  const description = process.argv[4] ? process.argv[4] : ""

  const ok = await createRepository(orgs, name, description)
  if (ok) {
    importRepository(repoPath, orgs, name)
  }
}


if (!GithubAccessToken) {
  console.log("Please set .env !")
  process.exit(1)
}

main()
