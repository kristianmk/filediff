document.getElementById('repoUrl').addEventListener('change', function() {
    const repoUrl = document.getElementById('repoUrl').value.trim();
    const repoPath = parseGitHubPath(repoUrl);
    if (repoPath) {
        fetchVersions(repoPath, 'version1');
        fetchVersions(repoPath, 'version2');
    } else {
        alert("Please enter a valid GitHub repository URL.");
    }
});

function parseGitHubPath(url) {
    const pathMatch = url.match(/github\.com\/([\w-]+\/[\w-]+)/);
    if (pathMatch && pathMatch.length > 1) {
        console.log("Parsed Repository Path:", pathMatch[1]); // Logging the parsed path for confirmation
        return pathMatch[1];
    } else {
        console.error("Failed to parse the repository path from the URL.");
        return null;
    }
}


function fetchTagsAndCommits(branchName) {
    const repoPath = parseGitHubPath(document.getElementById('repoUrl').value.trim());
    const tagsUrl = `https://api.github.com/repos/${repoPath}/tags`;
    const commitsUrl = `https://api.github.com/repos/${repoPath}/commits?sha=${branchName}`;

    // Fetch and populate tags
    fetch(tagsUrl)
        .then(response => response.json())
        .then(tags => {
            const tagSelector = document.getElementById('tagSelector');
            tagSelector.innerHTML = tags.map(tag => `<option value="${tag.name}">${tag.name}</option>`).join('');
        });

    // Fetch and populate commits, limiting to the most recent 30 for example
    fetch(commitsUrl)
        .then(response => response.json())
        .then(commits => {
            const commitSelector = document.getElementById('commitSelector');
            commitSelector.innerHTML = commits.slice(0, 30).map(commit => `<option value="${commit.sha}">${commit.commit.message.split('\n')[0]}</option>`).join('');
        });
}

// Fetch and populate branches on initial load or repository URL change
function fetchBranches(repoPath) {
    const branchesUrl = `https://api.github.com/repos/${repoPath}/branches`;
    fetch(branchesUrl)
        .then(response => response.json())
        .then(branches => {
            const branchSelector = document.getElementById('branchSelector');
            branchSelector.innerHTML = branches.map(branch => `<option value="${branch.name}">${branch.name}</option>`).join('');
        });
}


document.getElementById('diffForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const repoUrl = document.getElementById('repoUrl').value.trim();
    const repoPath = parseGitHubPath(repoUrl);
    const version1 = document.getElementById('version1').value;
    const version2 = document.getElementById('version2').value;
    const url = `https://api.github.com/repos/${repoPath}/compare/${version1}...${version2}`;

    fetch(url, {
        headers: { 'Accept': 'application/vnd.github.v3.diff' }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch diff: ' + response.statusText);
        }
        return response.text();
    })
    .then(diffText => {
        const targetElement = document.getElementById('diffOutput');
        const configuration = {
            inputFormat: 'diff',
            outputFormat: 'side-by-side',
            drawFileList: true,
            matching: 'lines',
            synchronisedScroll: true
        };
        const diff2htmlUi = new Diff2HtmlUI(targetElement, diffText, configuration);
        diff2htmlUi.draw();
        diff2htmlUi.highlightCode();
    })
    .catch(error => {
        console.error('Error fetching or processing the diff:', error);
        alert('Error fetching or processing the diff. Check console for details.');
    });
});
