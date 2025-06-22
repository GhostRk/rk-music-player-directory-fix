console.log('Lets write JavaScript');

// basePath attempts to get the root path of the application.
// For most local server setups where your project folder is the server root,
// this might simply resolve to "/". It's more critical when your app
// is deployed in a subfolder on a larger web server.
// For the purpose of this code, direct relative paths for `songs/` and `img/`
// are used where appropriate because they are usually at the server root.
const basePath = window.location.pathname.endsWith("/") ? window.location.pathname : window.location.pathname + "/";

let currentSong = new Audio();
let songs = []; // Initialize songs as an empty array
let currFolder;

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

async function getSongs(folder) {
    currFolder = folder;
    console.log(`Attempting to fetch songs from: songs/${folder}/`);
    let res = await fetch(`songs/${folder}/`); // Path relative to server root
    let html = await res.text();
    let tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    let anchors = tempDiv.getElementsByTagName("a");

    songs = []; // Clear songs array for new folder
    for (let anchor of anchors) {
        let href = anchor.getAttribute("href");
        if (href && href.toLowerCase().endsWith(".mp3")) {
            // Push only the decoded filename
            songs.push(decodeURIComponent(href.split("/").pop()));
        }
    }

    let songUL = document.querySelector(".songList ul");
    if (!songUL) {
        console.error("Error: .songList ul element not found for song list.");
        return [];
    }
    songUL.innerHTML = ""; // Clear existing songs before adding new ones

    if (songs.length === 0) {
        songUL.innerHTML = "<li>No songs found in this album.</li>";
        console.warn(`No .mp3 songs found in folder: ${folder}`);
    } else {
        for (const song of songs) {
            songUL.innerHTML += `
            <li>
                <img class="invert" width="34" src="img/music.svg" alt="Music icon">
                <div class="info">
                    <div>${song}</div> <div>Harry</div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="img/play.svg" alt="Play button">
                </div>
            </li>`;
        }
    }

    // Attach event listeners to the newly created song list items
    document.querySelectorAll(".songList ul li").forEach((li, i) => {
        li.addEventListener("click", () => {
            console.log("Clicked song:", songs[i]);
            playMusic(songs[i]);
        });
    });

    return songs;
}

const playMusic = (track, pause = false) => {
    // Path relative to server root
    currentSong.src = `songs/${currFolder}/${encodeURIComponent(track)}`; // Encode track for URL
    console.log(`Playing: ${decodeURIComponent(track)} from folder: ${currFolder}`);
    if (!pause) {
        currentSong.play();
        document.getElementById("play").src = "img/pause.svg";
    }
    document.querySelector(".songinfo").innerHTML = decodeURIComponent(track);
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
};

async function displayAlbums() {
    console.log("Displaying albums function called.");

    // Fetch the directory listing for the 'songs/' folder.
    // This assumes your 'songs' folder is directly at the root of your web server.
    let res = await fetch(`songs/`);
    console.log("Fetch response for songs/ directory:", res);

    // Check if the fetch request was successful.
    if (!res.ok) {
        console.error(`Failed to fetch songs directory. Status: ${res.status} ${res.statusText}`);
        console.error("Please ensure your web server is running and configured to serve directory listings for the 'songs/' folder (e.g., Python's http.server or Node's http-server).");
        return; // Stop execution if fetching fails
    }

    let html = await res.text();
    console.log("HTML content received from songs/ directory (truncated for brevity):", html.substring(0, 500) + "...");

    let tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    let anchors = tempDiv.getElementsByTagName("a");
    console.log("Found anchors in directory listing:", anchors.length);

    let cardContainer = document.querySelector(".cardContainer");
    if (!cardContainer) {
        console.error("Error: Element with class '.cardContainer' not found in HTML. Cards will not be displayed.");
        return; // Exit if the container element is missing
    }
    cardContainer.innerHTML = ""; // Clear existing cards before adding new ones
    console.log("Card container found:", cardContainer);

    let foldersFound = 0;
    for (let anchor of anchors) {
        const href = anchor.getAttribute("href");
        // console.log("Processing anchor href:", href); // Uncomment for very detailed link checking

        // We are looking for directory links, which usually end with a '/'
        if (!href || !href.endsWith("/")) {
            // console.log("Skipping non-directory link:", href); // Uncomment to see skipped items
            continue;
        }

        // Extract the folder name from the href
        const parts = href.split("/").filter(Boolean); // Filter(Boolean) removes empty strings
        const folder = parts[parts.length - 1]; // Get the last part, which should be the folder name

        if (!folder) {
            console.log("Skipping empty folder name derived from href:", href);
            continue;
        }

        // The image path must be relative to your server's root.
        // It's 'songs/folderName/cover.jpg' if 'songs' is at the root.
        const coverImagePath = `songs/${folder}/cover.jpg`;

        console.log(`Attempting to add card for folder: '${folder}' with cover image: '${coverImagePath}'`);

        // Add the card HTML to the container
        cardContainer.innerHTML += `
        <div data-folder="${folder}" class="card">
            <div class="play">
                <img class="playIcon" src="img/play.svg" alt="Play button">
            </div>
            <img src="${coverImagePath}" alt="${folder} album cover">
            <h2>${folder.replace(/[-_]/g, " ")}</h2>
            <p>Click to view songs</p>
        </div>`;
        foldersFound++;
    }

    if (foldersFound === 0) {
        cardContainer.innerHTML = "<p>No albums found. Please ensure 'songs/' contains subfolders with a 'cover.jpg' in each.</p>";
        console.warn("No valid song folders found in the 'songs/' directory listing. Please check your server setup and folder structure.");
    } else {
        console.log(`Successfully added ${foldersFound} album cards.`);
    }

    // Attach event listeners to the newly created cards
    document.querySelectorAll(".card").forEach(card => {
        const folder = card.dataset.folder;
        card.addEventListener("click", async () => {
            console.log("Card clicked, attempting to get songs for folder:", folder);
            songs = await getSongs(folder);
            if (songs.length > 0) {
                playMusic(songs[0]);
            } else {
                console.warn(`No songs found in folder: ${folder}. Displaying default message.`);
            }
        });
    });
}

async function main() {
    const play = document.getElementById("play");
    const previous = document.getElementById("previous");
    const next = document.getElementById("next");

    // Initialize with a default album or your first album
    await getSongs("mysongs"); // Make sure "mysongs" folder exists in your "songs" directory
    if (songs.length > 0) {
        playMusic(songs[0], true); // Play the first song but keep it paused initially
    } else {
        console.warn("Initial album 'mysongs' had no songs. Player might not initialize fully.");
    }

    await displayAlbums(); // This is where the cards are generated and displayed

    // Event Listeners for player controls
    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            play.src = "img/pause.svg";
        } else {
            currentSong.pause();
            play.src = "img/play.svg";
        }
    });

    // Fix for Previous button
    previous.addEventListener("click", () => {
        if (!songs || songs.length === 0) {
            console.warn("No songs loaded to go previous.");
            return;
        }
        // Decode the URI component to match what's in the 'songs' array
        const currentSongFileName = decodeURIComponent(currentSong.src.split("/").pop());
        const currentIndex = songs.indexOf(currentSongFileName);
        console.log("Previous button clicked. Current song:", currentSongFileName, "Index:", currentIndex);

        if (currentIndex > 0) {
            playMusic(songs[currentIndex - 1]);
        } else {
            console.log("Already at the first song. Looping to last song.");
            // Optionally loop to the last song
            playMusic(songs[songs.length - 1]);
        }
    });

    // Fix for Next button
    next.addEventListener("click", () => {
        if (!songs || songs.length === 0) {
            console.warn("No songs loaded to go next.");
            return;
        }
        // Decode the URI component to match what's in the 'songs' array
        const currentSongFileName = decodeURIComponent(currentSong.src.split("/").pop());
        const currentIndex = songs.indexOf(currentSongFileName);
        console.log("Next button clicked. Current song:", currentSongFileName, "Index:", currentIndex);

        if (currentIndex !== -1 && currentIndex < songs.length - 1) { // Check for -1 in case song isn't found
            playMusic(songs[currentIndex + 1]);
        } else if (songs.length > 0) { // If it's the last song, loop to the first
            console.log("Already at the last song or current song not found. Looping to first song.");
            playMusic(songs[0]);
        } else {
             console.log("No songs available to play next.");
        }
    });

    currentSong.addEventListener("timeupdate", () => {
        if (!isNaN(currentSong.duration)) {
            document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
            document.querySelector(".circle").style.left = `${(currentSong.currentTime / currentSong.duration) * 100}%`;
        }
    });

    document.querySelector(".seekbar").addEventListener("click", e => {
        if (!currentSong.duration) return; // Prevent errors if duration is not set yet
        const percent = e.offsetX / e.target.getBoundingClientRect().width;
        currentSong.currentTime = currentSong.duration * percent;
        document.querySelector(".circle").style.left = `${percent * 100}%`;
    });

    // Hamburger and Close button for mobile sidebar
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });

    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });

    // Volume control
    const volumeSlider = document.querySelector(".range input");
    if (volumeSlider) {
        // Set initial volume if not already set (e.g., in CSS)
        currentSong.volume = 0.5; // Set a default volume
        volumeSlider.value = 50; // Update slider to match

        volumeSlider.addEventListener("change", e => {
            const vol = parseInt(e.target.value, 10) / 100;
            currentSong.volume = vol;
            const volumeIcon = document.querySelector(".volume > img");
            if (volumeIcon) {
                // Update volume icon based on volume level
                volumeIcon.src = vol > 0 ? volumeIcon.src.replace("mute.svg", "volume.svg") : volumeIcon.src.replace("volume.svg", "mute.svg");
            }
        });
    } else {
        console.warn("Volume slider (.range input) not found.");
    }

    const volumeIcon = document.querySelector(".volume > img");
    if (volumeIcon) {
        volumeIcon.addEventListener("click", e => {
            if (e.target.src.includes("volume.svg")) {
                e.target.src = e.target.src.replace("volume.svg", "mute.svg");
                currentSong.volume = 0;
                if (volumeSlider) volumeSlider.value = 0;
            } else {
                e.target.src = e.target.src.replace("mute.svg", "volume.svg");
                currentSong.volume = 0.5; // Default back to initial volume
                if (volumeSlider) volumeSlider.value = 50;
            }
        });
    } else {
        console.warn("Volume icon (.volume > img) not found.");
    }
}

main(); // Start the application