// Webpack loader for src/data/quirq-repositories.json in the browser bundle: drops README text, which
// every page would otherwise download. App pages get their README through pageContext (server rendering
// and hydration match) and then read the current one from GitHub. Server rendering keeps the full file.
module.exports = function stripReadmes(source) {
    const snapshot = JSON.parse(source)
    return JSON.stringify({
        ...snapshot,
        repositories: snapshot.repositories.map((repo) => ({ ...repo, readmeMarkdown: null })),
    })
}
