document.getElementById('repoUrl').addEventListener('change', function() {
    const repoUrl = document.getElementById('repoUrl').value.trim();
    const repoPath = parseGitHubPath(repoUrl);
    if (repoPath) {
        fetchBranches(repoPath); // Fetch and populate branches
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

function fetchBranches(repoPath) {
    const branchesUrl = `https://api.github.com/repos/${repoPath}/branches`;
    fetch(branchesUrl)
        .then(response => response.json())
        .then(branches => {
            const branchSelector = document.getElementById('branchSelector');
            branchSelector.innerHTML = branches.map(branch => `<option value="${branch.name}">${branch.name}</option>`).join('');
            branchSelector.dispatchEvent(new Event('change')); // Automatically trigger the change event to fetch tags and commits
        });
}

// This function is to be called when the selected branch changes
function fetchTagsAndCommits(branchName) {
    const repoPath = parseGitHubPath(document.getElementById('repoUrl').value.trim());
    if (!repoPath) return;
    
    const tagsUrl = `https://api.github.com/repos/${repoPath}/tags`;
    const commitsUrl = `https://api.github.com/repos/${repoPath}/commits?sha=${branchName}`;

    // Fetch and populate tags
    fetch(tagsUrl)
        .then(response => response.json())
        .then(tags => {
            const tagSelector = document.getElementById('tagSelector');
            tagSelector.innerHTML = '<option value="">Select a tag</option>' + tags.map(tag => `<option value="${tag.name}">${tag.name}</option>`).join('');
        });

    // Fetch and populate commits, limiting to the most recent 30 for example
    fetch(commitsUrl)
        .then(response => response.json())
        .then(commits => {
            const commitSelector = document.getElementById('commitSelector');
            commitSelector.innerHTML = '<option value="">Select a commit</option>' + commits.slice(0, 30).map(commit => `<option value="${commit.sha}">${commit.commit.message.split('\n')[0]}</option>`).join('');
        });
}

document.getElementById('branchSelector').addEventListener('change', function() {
    const selectedBranch = this.value;
    fetchTagsAndCommits(selectedBranch); // Fetch and populate tags and commits for the selected branch
});

document.getElementById('diffForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const repoPath = parseGitHubPath(document.getElementById('repoUrl').value.trim());
    const branch = document.getElementById('branchSelector').value;
    const tag = document.getElementById('tagSelector').value;
    const commit = document.getElementById('commitSelector').value;

    // Logic to determine which versions to compare
    // This might need further refinement based on your specific requirements
    const version1 = tag || branch; // Prefer tag if selected, otherwise use branch
    const version2 = commit || tag || branch; // Prefer commit if selected, otherwise fallback to tag, then branch

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
