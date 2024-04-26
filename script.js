document.getElementById('repoUrl').addEventListener('change', function() {
    const repoUrl = document.getElementById('repoUrl').value;
    const repoPath = repoUrl.split("github.com/")[1];
    if (!repoPath) {
        alert("Please enter a valid GitHub repository URL.");
        return;
    }
    fetchVersions(repoPath, 'version1');
    fetchVersions(repoPath, 'version2');
});

function fetchVersions(repoPath, selectId) {
    const url = `https://api.github.com/repos/${repoPath}/tags`; // You can change this to /branches if needed
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById(selectId);
            select.innerHTML = data.map(tag => `<option value="${tag.name}">${tag.name}</option>`).join('');
            if (!data.length) {
                select.innerHTML = '<option>No versions found</option>';
            }
        })
        .catch(error => {
            console.error('Error fetching versions:', error);
            alert('Error fetching versions. Check console for details.');
        });
}

document.getElementById('diffForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const repoUrl = document.getElementById('repoUrl').value;
    const repoPath = repoUrl.split("github.com/")[1];
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
