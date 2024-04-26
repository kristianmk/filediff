function loadDiff() {
    const version1 = document.getElementById('version1').value;
    const version2 = document.getElementById('version2').value;
    const repoURL = 'https://github.com/kristianmk/party-hat-generator'; // Change this to your repo
    const diffURL = `${repoURL}/compare/${version1}..${version2}.diff`;

    fetch(diffURL)
        .then(response => response.text())
        .then(diffText => {
            const targetElement = document.getElementById('diffOutput');
            const configuration = {
                outputFormat: 'side-by-side', // or 'line-by-line'
                drawFileList: true
            };
            const diff2htmlUi = new Diff2HtmlUI(targetElement, diffText, configuration);
            diff2htmlUi.draw();
            diff2htmlUi.highlightCode();
        })
        .catch(error => {
            console.error('Error fetching or processing the diff:', error);
            alert('Failed to fetch or process diff. Check console for details.');
        });
}
