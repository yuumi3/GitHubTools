# GitHub Tools

## Tools

* list.js Display repository list as CSV
* remove.js Delete the specified repository
* import.js Import repositories from other Git servers
* backup.js Backup all repositories to S3

## .env (configuration)

```
GITHUB_ACCESS_TOKEN=Personal access token of GitHub API
GITHUB_OWNER=User name
GITHUB_PRIVATE=True to create a private repository.
SOURCE_GIT_URL=URL of the originating repository.
SOURCE_GIT_USER=Username of SOURCE_GIT_URL.
SOURCE_GIT_PASSWORD=Password of SOURCE_GIT_URL.
BACKUP_S3_BUCKET=Backup destination of S3 bucket.
```


## License

[MIT License](http://www.opensource.org/licenses/MIT).