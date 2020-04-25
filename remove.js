#!/usr/bin/env node

require('dotenv').config()

const fetch = require('node-fetch')
const GithubApi = "https://api.github.com"
const GithubAccessToken = process.env.GITHUB_ACCESS_TOKEN


const deletingRepository =  async (ownerRepo) => {
  const method = "DELETE"
  const url = `${GithubApi}/repos/${ownerRepo}`
  const headers = {"Authorization" : "token " + GithubAccessToken}

  const response = await fetch(url, {method, headers})
  if (! response.ok) {
    console.log("Error: ", response)
  }
}

if (!GithubAccessToken) {
  console.log("Please set .env !")
  process.exit(1)
}

if (process.argv.length < 3) {
  console.log("NO owner/repo")
  process.exit(1)
}

deletingRepository(process.argv[2])
