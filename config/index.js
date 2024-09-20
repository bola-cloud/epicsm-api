const env = process.env.NODE_ENV;
const production = require('./production');
const development = require('./development');

// You should put any global variables in here.
const config = {
  APP_NAME: 'LeGiteDuNucleaire',
  DATABASE_NAME: 'legitedunucleaire-db',
  DESC: "...",
  EMAIL: "legitedunucleaire@gmail.com",
  ROLES: ['admin', 'host', 'client']
};

if (env !== 'PRODUCTION') {
  module.exports = Object.assign({}, config, development);
} else {
  module.exports = Object.assign({}, config, production);
}
