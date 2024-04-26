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


function fetchVersions(repoPath, selectId) {
    const tagsUrl = `https://api.github.com/repos/${repoPath}/tags`;
    const branchesUrl = `https://api.github.com/repos/${repoPath}/branches`;
    
    Promise.all([
        fetch(tagsUrl).then(res => res.json()),
        fetch(branchesUrl).then(res => res.json())
    ]).then(([tags, branches]) => {
        const versions = [...tags, ...branches];
        const select = document.getElementById(selectId);
        if (versions.length > 0) {
            select.innerHTML = versions.map(v => `<option value="${v.name}">${v.name}</option>`).join('');
        } else {
            select.innerHTML = '<option>No versions found</option>';
        }
    }).catch(error => {
        console.error('Error fetching versions:', error);
        alert('Error fetching versions. Check console for details.');
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
