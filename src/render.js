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

let globalType = "mp4"

let tracker

let queue = []

const toMB = i => (i / 1024 / 1024).toFixed(2);

function Request(url, type) {
    if (!ytdl.validateURL(url)) {
        console.error('Invalid request link!')
        return;
    }
    let chk
    switch (type) {
        case 'mp4':
            chk = true
            break
        case 'mp3':
            chk = true
            break
        default:
            chk = false
            break
    }
    if (!chk) {
        console.error("Invalid type!");
        return
    }
    this.url = url;
    this.type = type;
    sidebar(this)
    queue.push(this)
}

async function sidebar(rqst) {
    vidInfo = await ytdl.getBasicInfo(rqst.url)
    rqst.title = vidInfo.videoDetails.title.replace(/"/g, '').replace(/|/g, '')
    rqst.thumb = `https://img.youtube.com/vi/${vidInfo.videoDetails.videoId}/maxresdefault.jpg`
    $('.sidebar').append(`<div class="item"> <img src="${rqst.thumb}"> <span>In Queue</span> </div>`);
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

$('#togType').click(() => {
    if (globalType === "mp4") {
        $('#togType img').attr('src', 'icons/speaker-4.svg')
        globalType = "mp3"
    } else {
        $('#togType img').attr('src', 'icons/video-camera-1.svg')
        globalType = "mp4"
    }
})

$('#goWeb').click(() => {
    cp.exec('start "" "https://github.com/shie1/sRQST"')
})

$('#clip').click(() => {
    new Request(clipboard.readText(), globalType)
})

$('#downloads').click(() => {
    cp.execSync(`explorer.exe ${path.resolve('./downloads/')}`)
})

$(".content").on("dragover", function(event) {
    event.preventDefault();
    event.stopPropagation();
    $(this).addClass('dragging');
});

$(".content").on("dragleave", function(event) {
    event.preventDefault();
    event.stopPropagation();
    $(this).removeClass('dragging');
});

$(".content").on("drop", async function(event) {
    event.preventDefault();
    event.stopPropagation();
    $(this).removeClass('dragging')
    url = event.originalEvent.dataTransfer.getData('url')
    new Request(url, globalType)
});

async function convert(rqst) {
    if (tracker) {
        return;
    }
    vidInfo = await ytdl.getBasicInfo(rqst.url)
    rqst.title = vidInfo.videoDetails.title.replace(/"/g, '').replace(/|/g, '')
    fileName = `${rqst.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`
    if (rqst.type == "mp3") {
        tracker = {
            start: Date.now(),
            audio: {
                downloaded: 0,
                total: Infinity
            }
        }
        audio = ytdl(rqst.url, {
                filter: 'audioonly',
                quality: 'highestaudio'
            })
            .on('progress', (_, downloaded, total) => {
                tracker.audio = {
                    downloaded,
                    total
                };
            }).pipe(fs.createWriteStream('./temp/temp.mp4'))
        progressbar = setInterval(() => {
            $('.sidebar').find('.item').first().find('span').first().text(`Audio | ${toMB(tracker.audio.downloaded)}MB/${toMB(tracker.audio.total)}MB | ${Math.floor((Date.now() - tracker.start) / 1000)}s`);
        }, 800);
        audio.on('close', () => {
            tomp3 = cp.spawn(ffmpeg, ['-i', path.resolve('./temp/temp.mp4'), '-c:a', 'libmp3lame', '-q:a', '2', `${path.resolve('./downloads')}\\${fileName}`])
            tomp3.on('close', () => {
                clearInterval(progressbar);
                tracker = undefined
                fs.unlinkSync('./temp/temp.mp4')
                setTimeout(() => {
                    queue.splice(0, 1);
                    $('.sidebar').find('.item').first().remove();
                    nAlert = new Notification('"' + rqst.title + '" successfully converted!', {
                        body: "Click here to open the file's location!"
                    })
                    nAlert.onclick = () => {
                        cp.exec(`explorer.exe/select,${path.resolve(`./downloads/${fileName}`)}`)
                    }
                }, 1000)
            })
        })
    } else {
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
        audio = ytdl(rqst.url, {
                filter: 'audioonly',
                quality: 'highestaudio'
            })
            .on('progress', (_, downloaded, total) => {
                tracker.audio = {
                    downloaded,
                    total
                };
            });
        video = ytdl(rqst.url, {
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
            $('.sidebar').find('.item').first().find('span').first().text(`Video | ${toMB(tracker.audio.downloaded + tracker.video.downloaded)}MB/${toMB(tracker.audio.total + tracker.video.total)}MB | ${Math.floor((Date.now() - tracker.start) / 1000)}s`);
        }, 800);
        ffmpegProcess = cp.spawn(ffmpeg, [
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
                        queue.splice(0, 1);
                        $('.sidebar').find('.item').first().remove();
                        nAlert = new Notification('"' + rqst.title + '" successfully converted!', {
                            body: "Click here to open the file's location!"
                        })
                        nAlert.onclick = () => {
                            cp.exec(`explorer.exe/select,${path.resolve(`./downloads/${fileName}`)}`)
                        }
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
}

window.addEventListener("resize", () => {
    $(':root').css('--screenH', `${height}px`)
    $(':root').css('--screenW', `${width}px`)
    document.body.classList.add("freeze");
    setTimeout(() => {
        document.body.classList.remove("freeze");
    }, 400);
});

setInterval(() => {
    if (!tracker && queue.length > 0) {
        convert(queue[0])
    } else {
        return
    }
}, 10000)