## Deploy(Run) Locally 

`npm i`

`npm start`

## Deploy on Railway 

#### Make a Railway Account 

Make an account at https://railway.app/

#### Install Railway CLI 

`brew install railway` or `npm i -g @railway/cli`

#### Authenticate 

`railway login`

#### Make a new project (Skip if already exists)

`railway init`

#### Deploy 

`railway up`

#### Updates (manual without CI/CD)

Make changes and then `railway up`

Note: Make sure to add env variables in railway app 
Note: Printing information about the user - `railway whoami`