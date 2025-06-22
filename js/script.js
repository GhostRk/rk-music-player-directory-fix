console.log('Lets write JavaScript');

// The basePath variable is largely unused with this static JSON approach,
// as all resource paths (songs, images, json) are assumed to be
// relative to the web server's root.
const basePath = window.location.pathname.endsWith("/") ? window.location.pathname : window.location.pathname + "/";

let currentSong = new Audio();
let songs = []; // Initialize songs as an empty array
let currFolder; // This will store the name of the currently selected folder (album)

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

// === UPDATED: getSongs to fetch from album-specific info.json ===
async function getSongs(folder) {
    currFolder = folder;
    console.log(`Attempting to fetch songs from: songs/${folder}/info.json`);

    try {
        // Fetch the info.json file for the specific album folder
        let res = await fetch(`songs/${folder}/info.json`);
        if (!res.ok) {
            // Log a more specific error if the file isn't found or has issues
            if (res.status === 404) {
                console.error(`Error 404: songs/${folder}/info.json not found. Please ensure the file exists at this path on Vercel and is correctly named.`);
            } else {
                console.error(`HTTP error! status: ${res.status} ${res.statusText} when fetching songs/${folder}/info.json`);
            }
            throw new Error(`Failed to fetch song list for folder ${folder}.`);
        }
        songs = await res.json(); // Parse the response as a JSON array of song filenames

        let songUL = document.querySelector(".songList ul");
        if (!songUL) {
            console.error("Error: .songList ul element not found for song list.");
            return [];
        }
        songUL.innerHTML = ""; // Clear existing songs before adding new ones

        if (songs.length === 0) {
            songUL.innerHTML = "<li>No songs found in this album.</li>";
            console.warn(`No songs found in folder: ${folder} (from info.json). The info.json might be empty or incorrect.`);
        } else {
            for (const song of songs) {
                // The song names in info.json should already be URL-decoded (plain filenames)
                // for display, but encode for URL when playing.
                const displaySongName = decodeURIComponent(song); // Just in case it's encoded in JSON
                songUL.innerHTML += `
                <li>
                    <img class="invert" width="34" src="img/music.svg" alt="Music icon">
                    <div class="info">
                        <div>${displaySongName}</div>
                        <div>Artist Name</div> </div>
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
                playMusic(songs[i]); // Pass the song filename as received from JSON
            });
        });

        return songs;

    } catch (error) {
        console.error(`An error occurred in getSongs for folder ${folder}:`, error);
        return [];
    }
}

const playMusic = (track, pause = false) => {
    // Construct the full path to the song, encoding the track name for the URL
    currentSong.src = `songs/${currFolder}/${encodeURIComponent(track)}`;
    console.log(`Playing: ${decodeURIComponent(track)} from folder: ${currFolder}`);
    if (!pause) {
        currentSong.play();
        document.getElementById("play").src = "img/pause.svg";
    }
    // Update song info in UI, ensure it's decoded for display
    document.querySelector(".songinfo").innerHTML = decodeURIComponent(track);
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
};

// === UPDATED: displayAlbums to fetch from top-level info.json ===
async function displayAlbums() {
    console.log("Displaying albums function called, fetching from songs/info.json.");

    let cardContainer = document.querySelector(".cardContainer");
    if (!cardContainer) {
        console.error("Error: Element with class '.cardContainer' not found in HTML. Cards will not be displayed.");
        return;
    }
    cardContainer.innerHTML = ""; // Clear existing cards before adding new ones

    try {
        // Fetch the top-level info.json file that lists all albums
        let res = await fetch(`songs/info.json`);
        console.log("Fetch response for songs/info.json:", res);

        if (!res.ok) {
            // Log a more specific error if the file isn't found or has issues
            if (res.status === 404) {
                console.error(`Error 404: songs/info.json not found. Please ensure the file exists at the root of your 'songs' directory on Vercel and is correctly named.`);
            } else {
                console.error(`HTTP error! status: ${res.status} ${res.statusText} when fetching songs/info.json`);
            }
            throw new Error(`Failed to fetch album list.`);
        }
        const albums = await res.json(); // Parse the response as a JSON array of album objects

        if (albums.length === 0) {
            cardContainer.innerHTML = "<p>No albums found in songs/info.json. The file might be empty or incorrect.</p>";
            console.warn("No albums found from songs/info.json. Please check its content and format.");
        }

        let foldersFound = 0;
        for (const album of albums) {
            // Ensure the album object has a 'folder' property
            if (!album.folder) {
                console.warn("Skipping album entry due to missing 'folder' property:", album);
                continue;
            }
            const folder = album.folder; // Get folder name from the JSON object
            const title = album.title || folder.replace(/[-_]/g, " "); // Use title from JSON or derive
            const description = album.description || "Click to view songs";

            // The image path assumes 'cover.jpg' exists in each album folder
            const coverImagePath = `songs/${folder}/cover.jpg`;

            console.log(`Attempting to add card for folder: '${folder}' with cover image: '${coverImagePath}'`);

            cardContainer.innerHTML += `
            <div data-folder="${folder}" class="card">
                <div class="play">
                    <img class="playIcon" src="img/play.svg" alt="Play button">
                </div>
                <img src="${coverImagePath}" alt="${title} album cover">
                <h2>${title}</h2>
                <p>${description}</p>
            </div>`;
            foldersFound++;
        }

        if (foldersFound > 0) {
            console.log(`Successfully added ${foldersFound} album cards from info.json.`);
        }

        // Attach event listeners to the newly created cards
        document.querySelectorAll(".card").forEach(card => {
            const folder = card.dataset.folder;
            card.addEventListener("click", async () => {
                console.log("Card clicked, attempting to get songs for folder:", folder);
                songs = await getSongs(folder); // This will call the updated getSongs function
                if (songs.length > 0) {
                    playMusic(songs[0]); // Play the first song of the selected album
                } else {
                    console.warn(`No songs found in folder: ${folder} after info.json fetch, or fetch failed.`);
                }
            });
        });

    } catch (error) {
        console.error('An error occurred in displayAlbums:', error);
        cardContainer.innerHTML = "<p>Failed to load albums. Please ensure songs/info.json exists and is valid, and check your browser console for errors.</p>";
    }
}

async function main() {
    const play = document.getElementById("play");
    const previous = document.getElementById("previous");
    const next = document.getElementById("next");

    // Initialize with a default album or your first album using the static JSON.
    // Ensure 'mysongs' is a folder you have set up with a 'songs/mysongs/info.json'.
    // This call will attempt to load the song list for the initial album.
    await getSongs("mysongs");
    if (songs.length > 0) {
        playMusic(songs[0], true); // Play the first song but keep it paused initially
    } else {
        console.warn("Initial album 'mysongs' had no songs or failed to load. Player might not initialize fully.");
    }

    await displayAlbums(); // This is where the cards are generated and displayed from the JSON

    // Event Listeners for player controls (These remain the same)
    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            play.src = "img/pause.svg";
        } else {
            currentSong.pause();
            play.src = "img/play.svg";
        }
    });

    previous.addEventListener("click", () => {
        if (!songs || songs.length === 0) {
            console.warn("No songs loaded to go previous.");
            return;
        }
        // Decode the URI component from currentSong.src to match what's in the 'songs' array
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

    next.addEventListener("click", () => {
        if (!songs || songs.length === 0) {
            console.warn("No songs loaded to go next.");
            return;
        }
        // Decode the URI component from currentSong.src to match what's in the 'songs' array
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
        // Set initial volume
        currentSong.volume = 0.5;
        volumeSlider.value = 50;

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
