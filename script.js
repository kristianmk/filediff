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
            commitSelector.innerHTML = '<option value="">Select a commit</option>' + commits.map(commit => { /* commits.slice(0, 30).map(commit => { */
                const commitDate = new Date(commit.commit.committer.date).toLocaleString();
                return `<option value="${commit.sha}">${commit.sha.substring(0, 7)} - ${commitDate} - ${commit.commit.message.split('\n')[0]}</option>`;
            }).join('');

            logToCommitIds();
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


function logToCommitIds() {
  const commitSelectorTo = document.getElementById('commitSelectorTo');
  const commitIds = Array.from(commitSelectorTo.options).map(option => option.value);
  console.log('To Commit IDs:', commitIds);
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
            globalCommits = commits; // Update global commits

            // Set initial indices
            fromIndex = autoSelect ? Math.min(1, commits.length - 1) : 0;
            toIndex = 0;

            displayTimeline(commits, document.getElementById('fileTimelineContainer'));
            updateNavigationButtons();

            if (autoSelect && commits.length >= 2) {
                setFromField(commits[fromIndex].sha, false);
                setToField(commits[toIndex].sha, commits[0].commit.message.split('\n')[0], false);
                updateTimelineHighlights();
                triggerDiff(); // Trigger the diff if necessary
            }
        })
        .catch(error => {
            console.error('Error fetching file history:', error);
            alert('Error fetching file history: ' + error.message);
        });
}



document.getElementById('prevButton').addEventListener('click', () => navigateCommits('prev'));
document.getElementById('nextButton').addEventListener('click', () => navigateCommits('next'));
document.getElementById('linkedSteppingCheckbox').addEventListener('change', toggleLinkedStepping);



function displayTimeline(commits, container) {
    clearTimelineDisplay(container);  // Clear existing content

    let lastCommitDate = new Date(commits[0].commit.committer.date);  // Initialize with the first commit date
    commits.forEach((commit, index) => {
        const commitDate = new Date(commit.commit.committer.date);
        const marker = document.createElement('div');
        marker.className = 'commit-marker';
        marker.dataset.sha = commit.sha;
        marker.title = commit.sha;  // Tooltip showing the full commit SHA
        marker.onclick = () => {
            setFromField(commit.sha);
            highlightActiveCommit(commit.sha, container);
            fromIndex = index;
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

function updateTimelineHighlights() {
    const container = document.querySelector('#fileTimelineContainer'); // Adjust if your container ID differs
    const fromSha = getVersion('From');
    const toSha = getVersion('To');
    
    // Reset any previously set highlights
    const markers = container.querySelectorAll('.commit-marker');
    markers.forEach(marker => marker.classList.remove('active', 'from', 'to'));
    
    // Update highlights based on the current selections
    highlightActiveCommit(fromSha, container);
    highlightActiveCommit(toSha, container);
}

// Modified highlightActiveCommit to manage both states
function highlightActiveCommit() {
    const container = document.querySelector("#fileTimelineContainer");
    const fromSha = getVersion("From");
    const toSha = getVersion("To");

    // Reset highlights
    container.querySelectorAll(".commit-marker").forEach((marker) => {
        marker.classList.remove("active", "from", "to");
        if (marker.dataset.sha === fromSha) marker.classList.add("from");
        if (marker.dataset.sha === toSha) marker.classList.add("to");
    });
}

// Sets the 'From' field and optionally triggers diff checking
function setFromField(commitSha, trigger = true) {
    const fromCommitSelector = document.getElementById('commitSelectorFrom');
    fromCommitSelector.value = commitSha;
    updateVersionSelection('commit', 'From');
    if (trigger) checkDiffReady();
}

function setToField(commitSha, commitMessage, trigger = true) {
    console.log("Attempting to set 'To' field with SHA:", commitSha);
    const toCommitSelector = document.getElementById('commitSelectorTo');
    
    // Check if the option exists
    let optionExists = Array.from(toCommitSelector.options).some(option => option.value === commitSha);
    console.log("Option exists:", optionExists);
    
    if (!optionExists) {
        // Create the option if it does not exist
        const newOption = document.createElement('option');
        newOption.value = commitSha;
        newOption.text = commitSha.substring(0, 7) + ' - ' + commitMessage;
        toCommitSelector.appendChild(newOption);
    }
    
    toCommitSelector.value = commitSha; // Set the value in the dropdown
    updateVersionSelection('commit', 'To'); // Update version selection for UI consistency
    if (trigger) checkDiffReady(); // Optionally trigger the diff check
    toCommitSelector.dispatchEvent(new Event('change')); // Ensure UI updates
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


// Navigate commits function, considering stepBoth state
function navigateCommits(direction) {
    if (globalCommits.length === 0) {
        console.warn("No commits available to navigate.");
        return;
    }

    const updateIndex = (index) => (direction === 'next' ? index + 1 : index - 1);
    fromIndex = updateIndex(fromIndex);
    toIndex = stepBoth ? updateIndex(toIndex) : toIndex;

    // Clamp indices to valid ranges
    fromIndex = Math.max(0, Math.min(fromIndex, globalCommits.length - 1));
    toIndex = Math.max(0, Math.min(toIndex, globalCommits.length - 1));

    const versionFrom = globalCommits[fromIndex]?.sha;
    const versionTo = globalCommits[toIndex]?.sha;
    if (versionFrom && versionTo) {
        setFromField(versionFrom, false);
        setToField(versionTo, false);
        triggerDiff(); // Trigger the diff with these selections
        updateTimelineHighlights(); // Update timeline highlights
    }
}


let globalCommits = [];
let fromIndex = -1; // Initial indices
let toIndex = -1;
let stepBoth = false;

// Update the function to toggle stepBoth
function toggleLinkedStepping() {
    stepBoth = document.getElementById("linkedSteppingCheckbox").checked;
}


function calculatePosition(date, commits) {
    const startDate = new Date(commits[0].commit.committer.date);
    const endDate = new Date(commits[commits.length - 1].commit.committer.date);
    const currentDate = new Date(date);

    const totalDuration = endDate - startDate;
    const currentDuration = currentDate - startDate;
    if(totalDuration === 0) return 0;

    return (currentDuration / totalDuration) * 100;
}
