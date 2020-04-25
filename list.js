#!/usr/bin/env node

require('dotenv').config()

const fetch = require('node-fetch')
const GithubApi = "https://api.github.com"
const GithubAccessToken = process.env.GITHUB_ACCESS_TOKEN


const listRepository =  async () => {
  const url = `${GithubApi}/user/repos?per_page=100&type=owner`
  const headers = {"Authorization" : "token " + GithubAccessToken}

  const response = await fetch(url, {headers})
  if (! response.ok) {
    console.log("Error: ", response)
  }
  const list = await response.json()
  return list
}

const listSortedRepository = async () => {
  const typeOrder = {"private": 0, "public": 1, "fork": 2}
  const repos = await listRepository()

  let sortedRepos = repos.map(e => {
    e.type = e.fork ? "fork" : (e.private ? "private" : "public")
    return e
  })
  sortedRepos.sort((a, b) => {
    if (a.type  == b.type) {
      return b.updated_at > a.updated_at ? 1 : -1
    } else {
      return typeOrder[a.type] - typeOrder[b.type]
    }
  })
  return sortedRepos
}

const listRepositoryByCSV = async () => {
  const sortedRepos = await listSortedRepository()
  let csv = sortedRepos.map(e =>
    `${e.name},"${e.description ? e.description : ''}",${e.type},${e.updated_at},${e.html_url}`
  )
  console.log("name,description,type,updated_at,url")
  console.log(csv.join("\n"))
}



if (!GithubAccessToken) {
  console.log("Please set .env !")
  process.exit(1)
}

listRepositoryByCSV()
