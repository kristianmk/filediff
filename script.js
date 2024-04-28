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

// Fetch and populate tags and commits, and update file list
function updateBranchData(repoPath, prefix) {
    fetchTagsAndCommits(repoPath, prefix); // Fetch tags and commits
    if (prefix === 'From') {
        updateFileList(repoPath, document.getElementById(`branchSelector${prefix}`).value); // Update file list for 'From' branch
    }
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
                updateBranchData(repoPath, prefix); // Initialize tags, commits, and file list on load
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
    const repoPath = parseGitHubPath(document.getElementById('repoUrl').value.trim());
    updateBranchData(repoPath, 'From'); // Update tags, commits, and file list on change
});

// Fetch and populate "To" versions
document.getElementById('branchSelectorTo').addEventListener('change', function() {
    const repoPath = parseGitHubPath(document.getElementById('repoUrl').value.trim());
    updateBranchData(repoPath, 'To'); // Update tags and commits on change
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


function fetchAndDisplayDiff(repoPath, versionFrom, versionTo) {
    if (!versionFrom || !versionTo || versionFrom === "" || versionTo === "") {
        alert("Both 'From' and 'To' versions must be selected before fetching diff.");
        return;
    }
    const url = `https://api.github.com/repos/${repoPath}/compare/${versionFrom}...${versionTo}`;
    fetch(url, {
        headers: { 'Accept': 'application/vnd.github.v3.diff' }
    }).then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch diff: ' + response.statusText);
        }
        return response.text();
    }).then(diffText => {
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
    }).catch(error => {
        console.error('Error fetching or processing the diff:', error);
        alert('Error fetching or processing the diff. Check console for details.');
    });
}




document.getElementById('diffForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const repoPath = parseGitHubPath(document.getElementById('repoUrl').value.trim());
    const versionFrom = getVersion('From');
    const versionTo = getVersion('To');
    
    if (versionFrom && versionTo) {  // Ensure both versions are selected
        fetchAndDisplayDiff(repoPath, versionFrom, versionTo);
    } else {
        alert('Please select both a source and a target version for the comparison.');
    }
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
    console.log(`Fetching files from ${url}`); // Log the URL being fetched
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(files => {
            const fileSelector = document.getElementById('fileSelector');
            fileSelector.innerHTML = '<option value="">None</option>';  // Ensures there is always an option to select no file
            console.log(`Received files:`, files); // Log the files received
            files.forEach(file => {
                if (file.type === "file") {
                    const option = document.createElement('option');
                    option.value = file.path;
                    option.textContent = file.name;
                    fileSelector.appendChild(option);
                }
            });
        })
        .catch(error => {
            console.error('Error fetching files:', error); // Log any errors
        });
}


document.getElementById('fileSelector').addEventListener('change', function() {
    const repoPath = parseGitHubPath(document.getElementById('repoUrl').value.trim());
    const filePath = this.value;
    if (filePath) {
        fetchFileHistory(repoPath, filePath, true);  // true for auto-select latest two commits
    } else {
        clearTimelineDisplay();
    }
});


function clearTimelineDisplay() {
    const baseLine = document.querySelector('#fileTimelineContainer .timeline-baseLine');
    if (baseLine) {
        baseLine.innerHTML = ''; // Clears the content of the baseline div
    } else {
        console.error('Timeline baseLine element not found.');
    }
}


// Fetches the file history and auto-selects the last two commits
function fetchFileHistory(repoPath, filePath, autoSelect = false) {
    const url = `https://api.github.com/repos/${repoPath}/commits?path=${filePath}`;
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(commits => {
            displayTimeline(commits, document.getElementById('fileTimelineContainer'));
            globalCommits = commits;
            updateNavigationButtons();
            if (autoSelect && commits.length >= 2) {
                const fromCommitSha = commits[commits.length - 2].sha;
                const toCommitSha = commits[commits.length - 1].sha;
                console.log("Setting 'From' field with SHA:", fromCommitSha);
                setFromField(fromCommitSha, false);  // Set the 'From' field
                console.log("Setting 'To' field with SHA:", toCommitSha);
                setToField(toCommitSha, false);  // Set the 'To' field
                console.log("Both 'From' and 'To' fields are now set with SHAs:", fromCommitSha, toCommitSha);
                triggerDiff();  // Now trigger the diff since both fields are set
            }
        })
        .catch(error => {
            console.error('Error fetching file history:', error);
            alert('Error fetching file history: ' + error.message);
        });
}



document.getElementById('prevButton').addEventListener('click', () => {
    // Logic for handling the previous button click
    navigateCommits('prev', globalCommits); // You'll need to maintain a globalCommits array
});

document.getElementById('nextButton').addEventListener('click', () => {
    // Logic for handling the next button click
    navigateCommits('next', globalCommits); // You'll need to maintain a globalCommits array
});


function displayTimeline(commits, container) {
    clearTimelineDisplay(container);  // Clear existing content

    let lastCommitDate = new Date(commits[0].commit.committer.date);  // Initialize with the first commit date
    commits.forEach((commit, index) => {
        const commitDate = new Date(commit.commit.committer.date);
        const marker = document.createElement('div');
        marker.className = 'commit-marker';
        marker.dataset.sha = commit.sha;
        marker.onclick = () => {
            setFromField(commit.sha);
            highlightActiveCommit(commit.sha, container);
        };
        //container.appendChild(marker);
        container.querySelector('.timeline-baseLine').appendChild(marker);

        // Calculate time difference for flex-grow
        if (index < commits.length - 1) {
            const nextCommitDate = new Date(commits[index + 1].commit.committer.date);
            const timeDiff = nextCommitDate - commitDate;
            const spacer = document.createElement('div');
            spacer.className = 'space';
            spacer.style.flexGrow = timeDiff.toString();  // Use time difference as flex-grow factor
            container.appendChild(spacer);
            lastCommitDate = nextCommitDate;  // Update lastCommitDate
        }
    });
}



// Update the highlightActiveCommit to handle both 'From' and 'To'
function highlightActiveCommit(activeSha, container) {
    const markers = container.querySelectorAll('.commit-marker');
    markers.forEach(marker => {
        marker.classList.remove('active', 'from', 'to');
        if (marker.dataset.sha === getVersion('From')) {
            marker.classList.add('from');
        }
        if (marker.dataset.sha === getVersion('To')) {
            marker.classList.add('to');
        }
        if (marker.dataset.sha === activeSha) {
            marker.classList.add('active');
        }
    });
}


// Sets the 'From' field and optionally triggers diff checking
function setFromField(commitSha, trigger = true) {
    const fromCommitSelector = document.getElementById('commitSelectorFrom');
    fromCommitSelector.value = commitSha;
    updateVersionSelection('commit', 'From');
    if (trigger) checkDiffReady();
}

// Sets the 'To' field and optionally triggers diff checking
function setToField(commitSha, trigger = true) {
    const toCommitSelector = document.getElementById('commitSelectorTo');
    toCommitSelector.value = commitSha;
    updateVersionSelection('commit', 'To');
    if (trigger) checkDiffReady();
}

// Checks if both 'From' and 'To' are set before triggering the diff
function checkDiffReady() {
    const versionFrom = getVersion('From');
    const versionTo = getVersion('To');
    if (versionFrom && versionTo) {
        triggerDiff();
    } else {
        console.log("Waiting for both 'From' and 'To' versions to be selected.");
    }
}

// Triggers the diff if both 'From' and 'To' versions are selected
function triggerDiff() {
    const repoPath = parseGitHubPath(document.getElementById('repoUrl').value.trim());
    const versionFrom = getVersion('From');
    const versionTo = getVersion('To');
    if (versionFrom && versionTo) {
        fetchAndDisplayDiff(repoPath, versionFrom, versionTo);
    }
}


function updateNavigationButtons() {
    const hasCommits = globalCommits.length > 1;
    document.getElementById('prevButton').disabled = !hasCommits;
    document.getElementById('nextButton').disabled = !hasCommits;
    if (!hasCommits) {
        console.warn('No commits available to navigate.');
    }
}


function navigateCommits(direction) {
    if (!globalCommits.length) {
        console.warn('No commits available to navigate.');
        return;
    }

    let currentIndex = globalCommits.findIndex(commit => commit.sha === document.getElementById('commitSelectorFrom').value);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    newIndex = Math.max(0, Math.min(newIndex, globalCommits.length - 1));

    if (newIndex !== currentIndex) {
        const newCommitSha = globalCommits[newIndex].sha;
        document.getElementById('commitSelectorFrom').value = newCommitSha;
        updateVersionSelection('commit', 'From');
        const versionTo = getVersion('To');
        fetchAndDisplayDiff(parseGitHubPath(document.getElementById('repoUrl').value.trim()), newCommitSha, versionTo);
        highlightActiveCommit(newCommitSha, document.getElementById('fileTimelineContainer'));
    }
}


let globalCommits = [];


function calculatePosition(date, commits) {
    const startDate = new Date(commits[0].commit.committer.date);
    const endDate = new Date(commits[commits.length - 1].commit.committer.date);
    const currentDate = new Date(date);

    const totalDuration = endDate - startDate;
    const currentDuration = currentDate - startDate;
    if(totalDuration === 0) return 0;

    return (currentDuration / totalDuration) * 100;
}
