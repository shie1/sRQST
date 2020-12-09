const {
    remote,
    clipboard
} = require('electron')
const path = require('path');
const fs = require('fs')
const ytdl = require('ytdl-core')
const cp = require('child_process');
const ffmpeg = require('ffmpeg-static');
const {
    width,
    height
} = require("screenz");

$(':root').css('--screenH', `${height}px`)
$(':root').css('--screenW', `${width}px`)

let tracker

function copy(text) {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    };
    navigator.clipboard.writeText(text);
}

function alert(text, ms) {
    $('#alert').text(text)
    $('.content').css('height', 'calc(100vh - var(--header-size) * 2)')
    if (!ms) {
        return
    }
    setTimeout(() => {
        alertS()
    }, ms)
}

function alertS() {
    $('.content').css('height', 'calc(100vh - var(--header-size) * 1')
    setTimeout(() => {
        $('#alert').text('')
    }, 100)
}

$('#closeApp').click(() => {
    $('footer').remove();
    $('.content').css('animation', 'wrap 0.5s infinite')
    setTimeout(() => {
        $('.content').remove();
        $('header').css('animation', 'close 0.5s infinite')
        setTimeout(() => {
            $('header').remove()
            window.close()
        }, 450)
    }, 450);
})

$(".content").on("dragover", function(event) {
    if (tracker) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    $(this).addClass('dragging');
});

$(".content").on("dragleave", function(event) {
    if (tracker) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    $(this).removeClass('dragging');
});

$(".content").on("drop", async function(event) {
    if (tracker) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    $(this).removeClass('dragging')
    link = event.originalEvent.dataTransfer.getData('url')
    convert(link)

});

$('#goWeb').click(() => {
    cp.exec('start "" "https://github.com/shie1/sRQST"')
})

$('#clip').click(() => {
    if (tracker) {
        return;
    }
    convert(clipboard.readText())
})

async function convert(link) {
    if (!ytdl.validateURL(link)) {
        alert('This is not a YouTube video!', 1500)
        return;
    }
    title = (await ytdl.getBasicInfo(link)).videoDetails.title.replace(/|/g, '').replace(/"/g, '')
    tracker = {
        start: Date.now(),
        audio: {
            downloaded: 0,
            total: Infinity
        },
        video: {
            downloaded: 0,
            total: Infinity
        },
        merged: {
            frame: 0,
            speed: '0x',
            fps: 0
        },
    };
    audio = ytdl(link, {
            filter: 'audioonly',
            quality: 'highestaudio'
        })
        .on('progress', (_, downloaded, total) => {
            tracker.audio = {
                downloaded,
                total
            };
        });
    video = ytdl(link, {
            filter: 'videoonly',
            quality: 'highestvideo'
        })
        .on('progress', (_, downloaded, total) => {
            tracker.video = {
                downloaded,
                total
            };
        });
    progressbar = setInterval(() => {
        alert(`"${title}" | Running for: ${Math.floor((Date.now() - tracker.start) / 1000)} seconds`);
    }, 800);
    fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`
    ffmpegProcess = ffmpegProcess = cp.spawn(ffmpeg, [
        // Remove ffmpeg's console spamming
        '-loglevel', '0', '-hide_banner',
        // Redirect/enable progress messages
        '-progress', 'pipe:3',
        // 0 second audio offset
        '-itsoffset', '0', '-i', 'pipe:4',
        '-i', 'pipe:5',
        // Choose some fancy codes
        '-c:v', 'libx265', '-x265-params', 'log-level=0',
        '-c:a', 'flac',
        // Define output container
        '-f', 'matroska', 'pipe:6',
    ], {
        windowsHide: true,
        stdio: [
            /* Standard: stdin, stdout, stderr */
            'inherit', 'inherit', 'inherit',
            /* Custom: pipe:3, pipe:4, pipe:5, pipe:6 */
            'pipe', 'pipe', 'pipe', 'pipe',
        ],
    });
    ffmpegProcess.on('close', () => {
        setTimeout(() => {
            after = cp.spawn(ffmpeg, ['-y', '-i', `${path.resolve('./temp/temp.mp4')}`, '-c:v', 'libx264', '-c:a', 'aac', '-strict', 'experimental', '-tune', 'fastdecode', '-pix_fmt', 'yuv420p', '-b:a', '192k', '-ar', '48000', `${path.resolve('./downloads')}\\${fileName}`])
            after.on('close', () => {
                clearInterval(progressbar);
                tracker = undefined
                fs.unlinkSync('./temp/temp.mp4')
                setTimeout(() => {
                    alert(`Video successfully converted!`, 2000);
                    setTimeout(() => {
                        cp.exec(`start "" "${path.resolve('./downloads')}"`)
                    }, 2000)
                }, 1000)
            })
        }, 2000)
    });

    ffmpegProcess.stdio[3].on('data', chunk => {
        // Parse the param=value list returned by ffmpeg
        const lines = chunk.toString().trim().split('\n');
        const args = {};
        for (const l of lines) {
            const [key, value] = l.trim().split('=');
            args[key] = value;
        }
        tracker.merged = args;
    });
    audio.pipe(ffmpegProcess.stdio[4]);
    video.pipe(ffmpegProcess.stdio[5]);
    ffmpegProcess.stdio[6].pipe(fs.createWriteStream('./temp/temp.mp4'));
}

window.addEventListener("resize", () => {
    $(':root').css('--screenH', `${height}px`)
    $(':root').css('--screenW', `${width}px`)
    document.body.classList.add("freeze");
    setTimeout(() => {
        document.body.classList.remove("freeze");
    }, 400);
});