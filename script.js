document.getElementById('diffForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevents form from submitting traditionally
    const version1 = document.getElementById('version1').value;
    const version2 = document.getElementById('version2').value;
    const repo = 'kristianmk/party-hat-generator'; // Specify your repository
    const url = `https://api.github.com/repos/${repo}/compare/${version1}...${version2}`;

    fetch(url, {
        headers: {
            'Accept': 'application/vnd.github.v3.diff' // Requesting diff format directly
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch diff: ' + response.statusText);
        }
        return response.text(); // Get the diff as plain text
    })
    .then(diffText => {
        const targetElement = document.getElementById('diffOutput');
        const configuration = {
            inputFormat: 'diff', // Ensure the input format is set to 'diff'
            outputFormat: 'side-by-side', // You can choose 'line-by-line'
            drawFileList: true, // Shows list of changed files
            matching: 'lines', // Shows line matching
            synchronisedScroll: true // Syncs scrolls between two panes
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
