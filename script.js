document.getElementById('repoUrl').addEventListener('change', function() {
    const repoUrl = document.getElementById('repoUrl').value.trim();
    const repoPath = parseGitHubPath(repoUrl);
    if (repoPath) {
        fetchBranches(repoPath, 'From'); // Fetch and populate "From" branches
        fetchBranches(repoPath, 'To'); // Fetch and populate "To" branches
    } else {
        alert("Please enter a valid GitHub repository URL.");
    }
});

function parseGitHubPath(url) {
    const pathMatch = url.match(/github\.com\/([\w-]+\/[\w-]+)/);
    return pathMatch ? pathMatch[1] : null;
}

function fetchBranches(repoPath, prefix) {
    const branchesUrl = `https://api.github.com/repos/${repoPath}/branches`;
    fetch(branchesUrl)
        .then(response => response.json())
        .then(branches => {
            const branchSelector = document.getElementById(`branchSelector${prefix}`);
            branchSelector.innerHTML = branches.map(branch => 
                `<option value="${branch.name}" ${branch.name === 'main' || branch.name === 'master' ? 'selected' : ''}>${branch.name}</option>`
            ).join('');
            fetchTagsAndCommits(repoPath, prefix); // Fetch tags and commits after branches are loaded
        })
        .catch(error => console.error('Error fetching branches:', error));
}

function fetchTagsAndCommits(repoPath, prefix) {
    const tagsUrl = `https://api.github.com/repos/${repoPath}/tags`;
    const commitsUrl = `https://api.github.com/repos/${repoPath}/commits`;

    // Fetch and populate tags
    fetch(tagsUrl)
        .then(response => response.json())
        .then(tags => {
            const tagSelector = document.getElementById(`tagSelector${prefix}`);
            if (tags.length) {
                tagSelector.innerHTML = '<option value="">Select a tag</option>' + tags.map(tag => 
                    `<option value="${tag.name}">${tag.name}</option>`
                ).join('');
            } else {
                tagSelector.innerHTML = '<option>No tags</option>';
                tagSelector.disabled = true; // Disable tag dropdown if no tags
            }
        })
        .catch(error => console.error('Error fetching tags:', error));

    // Fetch and populate commits
    fetch(commitsUrl)
        .then(response => response.json())
        .then(commits => {
            const commitSelector = document.getElementById(`commitSelector${prefix}`);
            commitSelector.innerHTML = '<option value="">Select a commit</option>' + commits.slice(0, 30).map(commit => {
                const commitDate = new Date(commit.commit.committer.date).toLocaleString();
                return `<option value="${commit.sha}">${commit.sha.substring(0, 7)} - ${commitDate} - ${commit.commit.message.split('\n')[0]}</option>`;
            }).join('');
        })
        .catch(error => console.error('Error fetching commits:', error));
}

document.getElementById('loadExample').addEventListener('click', function(event) {
    event.preventDefault();  // Prevent the link from navigating
    document.getElementById('repoUrl').value = 'https://github.com/kristianmk/party-hat-generator';
    // Trigger the change event to fetch branches, tags, and commits for the example repo
    document.getElementById('repoUrl').dispatchEvent(new Event('change'));
});

// Fetch and populate "From" versions
document.getElementById('branchSelectorFrom').addEventListener('change', function() {
    const selectedBranch = this.value;
    const repoPath = parseGitHubPath(document.getElementById('repoUrl').value.trim());
    // When a new 'From' branch is selected, fetch the associated tags and commits
    fetchTagsAndCommits(repoPath, 'From');
    updateFileList(repoPath, selectedBranch); // Allow file selection from branchSelectorFrom only.
});

// Fetch and populate "To" versions
document.getElementById('branchSelectorTo').addEventListener('change', function() {
    const repoPath = parseGitHubPath(document.getElementById('repoUrl').value.trim());
    fetchTagsAndCommits(repoPath, 'To');
});

// Function to remove highlights from all dropdowns
function removeHighlights(prefix) {
    //document.getElementById(`branchSelector${prefix}`).classList.remove('active-selection');
    document.getElementById(`tagSelector${prefix}`).classList.remove('active-selection');
    document.getElementById(`commitSelector${prefix}`).classList.remove('active-selection');
}

/*
document.querySelectorAll('select').forEach(function(selector) {
    selector.addEventListener('change', function() {
        // Remove active-selection from all selects
        document.querySelectorAll('select').forEach(sel => sel.classList.remove('active-selection'));
        
        // Add active-selection to the currently changed select
        this.classList.add('active-selection');
    });
});
*/

// Function to update version selection and highlight the active field
function updateVersionSelection(type, prefix) {
    removeHighlights(prefix); // First, remove all existing highlights
    const selector = document.getElementById(`${type}Selector${prefix}`);
    selector.classList.add('active-selection'); // Add highlight to the active field
    // Update the selected version to be used for diffing
    document.getElementById(`selectedVersion${prefix}`).value = selector.value;
}

// Add event listeners to tag and commit selectors to update version selection
['From', 'To'].forEach(prefix => {
    document.getElementById(`tagSelector${prefix}`).addEventListener('change', function() {
        updateVersionSelection('tag', prefix);
    });
    
    document.getElementById(`commitSelector${prefix}`).addEventListener('change', function() {
        updateVersionSelection('commit', prefix);
    });
});


document.getElementById('diffForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const repoPath = parseGitHubPath(document.getElementById('repoUrl').value.trim());
    
    // Retrieve the selected "From" version
    const version1 = getVersion('From');
    // Retrieve the selected "To" version
    const version2 = getVersion('To');
    
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


document.getElementById('pasteUrl').addEventListener('click', function() {
    navigator.clipboard.readText().then(clipText => {
        const repoUrlInput = document.getElementById('repoUrl');
        repoUrlInput.value = clipText; // Paste
        repoUrlInput.dispatchEvent(new Event('change')); // Trigger the change event manually
    }).catch(err => {
        console.error('Error pasting text: ', err);
        alert('Failed to paste text: ' + err);
    });
});


// Utility function to get the selected version from the "From" or "To" dropdowns
function getVersion(prefix) {
    // Use the value from the hidden input that keeps track of the latest selection
    return document.getElementById(`selectedVersion${prefix}`).value;
}


function updateFileList(repoPath, branch) {
    const url = `https://api.github.com/repos/${repoPath}/contents?ref=${branch}`;
    fetch(url)
        .then(response => response.json())
        .then(files => {
            const fileSelector = document.getElementById('fileSelector');
            fileSelector.innerHTML = '<option value="">None</option>';  // Ensures there is always an option to select no file
            files.forEach(file => {
                if (file.type === "file") {
                    const option = document.createElement('option');
                    option.value = file.path;
                    option.textContent = file.name;
                    fileSelector.appendChild(option);
                }
            });
        })
        .catch(error => console.error('Error fetching files:', error));
}

document.getElementById('fileSelector').addEventListener('change', function() {
    const repoPath = parseGitHubPath(document.getElementById('repoUrl').value.trim());
    const filePath = this.value;
    if (filePath) {
        fetchFileHistory(repoPath, filePath);
    } else {
        // Clear any existing timeline display if 'None' is selected
        clearTimelineDisplay();
    }
});

function fetchFileHistory(repoPath, filePath) {
    const url = `https://api.github.com/repos/${repoPath}/commits?path=${filePath}`;
    fetch(url)
        .then(response => response.json())
        .then(commits => {
            displayTimeline(commits);
        })
        .catch(error => console.error('Error fetching file history:', error));
}

function clearTimelineDisplay() {
    // Clear the timeline display area, adjust based on your implementation
    const timelineArea = document.getElementById('timelineDisplay');
    timelineArea.innerHTML = '';
}

function displayTimeline(commits) {
    const timelineContainer = document.getElementById("fileTimelineContainer");
    const baseLine = document.createElement("div");
    baseLine.style.position = "absolute";
    baseLine.style.width = "100%";
    baseLine.style.height = "2px";
    baseLine.style.backgroundColor = "#ccc";
    timelineContainer.appendChild(baseLine);

    // Assume commits is an array of objects with a date property
    commits.forEach(commit => {
        const marker = document.createElement("div");
        marker.style.position = "absolute";
        marker.style.left = calculatePosition(commit.date, commits) + "%"; // Calculate position based on date
        marker.style.top = "0";
        marker.style.height = "50px";
        marker.style.width = "5px";
        marker.style.backgroundColor = "#007bff";
        timelineContainer.appendChild(marker);
    });
}

function calculatePosition(date, commits) {
    const startDate = new Date(commits[0].date); // assuming commits are sorted by date
    const endDate = new Date(commits[commits.length - 1].date);
    const currentDate = new Date(date);
    const totalDuration = endDate - startDate;
    const currentDuration = currentDate - startDate;
    return (currentDuration / totalDuration) * 100; // returns a percentage of the total timeline width
}



