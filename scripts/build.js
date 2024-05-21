
// starts a command line process to get the git hash
const commitHash = require('child_process')
  .execSync('git log --pretty=format:"%h" -n1')
  .toString()
  .trim();

const buildTime = new Date().toString()

module.exports = {
  commitHash,
  buildTime
}