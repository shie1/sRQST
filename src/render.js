const {
    clipboard,
    remote
} = require('electron')
const path = require('path');
const fs = require('fs')
const ytdl = require('ytdl-core')
const cp = require('child_process');
const ffmpeg = require('ffmpeg-static');
const ytpl = require('ytpl')
const {
    width,
    height
} = require("screenz");
const DCRPC = require('discord-rpc')

const clientId = "805158215876345927"
const applaunch = Date.now()

DCRPC.register(clientId);
const RPC = new DCRPC.Client({ transport: 'ipc' });

try {
    if (fs.readFileSync('./.devmode') == "true") {
        dev = true
    } else {
        dev = false
    }
} catch (error) {
    dev = false
}

if (dev) {
    root = "./"
} else {
    root = "./resources/app/"
}

let storage = JSON.parse(fs.readFileSync('./storage.json'))
let app = JSON.parse(fs.readFileSync(root + 'package.json'))

$('.ver').html('v' + app.version)

$(':root').css('--screenH', `${height}px`)
$(':root').css('--screenW', `${width}px`)

let globalType = storage.globalType

let quality = storage.quality

let tracker

let queue = []

let state

let onTop = false

const toMB = i => (i / 1024 / 1024).toFixed(2);

$('#quality').val(quality)

if (globalType === "mp3") {
    $('#togType img').attr('src', 'icons/speaker-4.svg')
} else {
    $('#togType img').attr('src', 'icons/video-camera-1.svg')
}

function rIdle() {
    RPC.setActivity({
        details: 'v' + app.version,
        state: "Idle",
        startTimestamp: applaunch,
        largeImageKey: 'icon_min',
        largeImageText: 'sRequest',
        smallImageKey: 'icon',
        smallImageText: 'Idle',
        instance: false,
    });
}

function rConv() {
    RPC.setActivity({
        details: 'v' + app.version,
        state: "Converting a video",
        startTimestamp: tracker.start,
        largeImageKey: 'icon_min',
        largeImageText: 'sRequest',
        smallImageKey: 'icon',
        smallImageText: 'Converting a video',
        instance: false,
    });
}

RPC.on('ready', () => {
    if (tracker) { state = 2 } else { state = 1 }
    switch (state) {
        case 1:
            rIdle()
            break
        case 2:
            rConv()
            break
    }
    setInterval(() => {
        if (tracker) { state = 2 } else { state = 1 }
        switch (state) {
            case 1:
                rIdle()
                break
            case 2:
                rConv()
                break
        }
    }, 15e3);
});

RPC.login({ clientId }).catch(console.error);

function writeStorage(name, data) {
    storage[name] = data
    fs.writeFileSync('./storage.json', JSON.stringify(storage))
    return true
}

function delStorage(name) {
    delete storage[name]
    fs.writeFileSync('./storage.json', JSON.stringify(storage))
    return true
}

function cq(q) {
    switch (q) {
        case '137':
            return "1080p (AVC1)"
        case '248':
            return "1080p (VP9)"
        case '136':
            return "720p (AVC1)"
        case '247':
            return "720p (VP9)"
        case '135':
            return "480p (AVC1)"
        default:
            return "Highest"
    }
}

async function drag(url) {
    try {
        id = await ytpl.getPlaylistID(url.toString())
        pl = await ytpl(id.toString())
    } catch (error) {
        if (ytdl.validateURL(url)) {
            new Request(url, globalType)
            return;
        } else {
            console.error("Invalid input!")
            return;
        }
    }
    for (item of pl.items) {
        new Request(item.shortUrl, globalType)
    }
}

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
    rqst.thumb = `https://img.youtube.com/vi/${vidInfo.videoDetails.videoId}/hqdefault.jpg`
    $('.sidebar').append(`<div class="item"> <img src="${rqst.thumb}"> <span>In Queue</span> </div>`);
}

$('#closeApp').click(() => {
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
    writeStorage('globalType', globalType)
})

$('#quality').on('change', () => {
    quality = $('#quality').val()
    writeStorage('quality', quality)
})

$('#goWeb').click(() => {
    cp.exec('start "" "https://github.com/shie1/sRQST"')
})

$('#clip').click(() => {
    drag(clipboard.readText())
})

$('#downloads').click(() => {
    try { cp.execSync(`explorer.exe ${path.resolve('./downloads/')}`) } catch {}
})

$('#onTop').on('click', () => {
    if (!onTop) {
        $('#onTop').addClass('on')
        remote.BrowserWindow.getAllWindows()[0].setAlwaysOnTop(true, 'screen')
    } else {
        $('#onTop').removeClass('on')
        remote.BrowserWindow.getAllWindows()[0].setAlwaysOnTop(false)
    }
    onTop = !onTop
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
    drag(url)
});

async function convert(rqst) {
    if (tracker) {
        return;
    }
    vidInfo = await ytdl.getInfo(rqst.url)
    rqst.title = vidInfo.videoDetails.title.replace(/"/g, '').replace(/|/g, '')
    try { ytdl.chooseFormat(vidInfo.formats, { quality: quality }); } catch {
        console.warn("Video quality too high, converting video in best possible quality instead!")
        quality = "highestvideo"
    }
    if (rqst.type == "mp3") {
        fileName = `${rqst.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`
        tracker = {
            start: Date.now(),
            audio: {
                downloaded: 0,
                total: '?'
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
            let prog
            if (tracker.audio.downloaded != tracker.audio.total) {
                prog = `${toMB(tracker.audio.downloaded)}MB/${toMB(tracker.audio.total)}MB`
            } else {
                prog = 'Processing'
            }
            $('.sidebar').find('.item').first().find('span').first().text(`Audio | ${prog} | ${Math.floor((Date.now() - tracker.start) / 1000)}s`);
        }, 800);
        audio.on('close', () => {
            tomp3 = cp.spawn(ffmpeg, ['-y', '-i', path.resolve('./temp/temp.mp4'), '-c:a', 'libmp3lame', '-q:a', '2', `${path.resolve('./downloads')}\\${fileName}`])
            tomp3.on('close', () => {
                clearInterval(progressbar);
                tracker = undefined
                fs.unlinkSync('./temp/temp.mp4')
                setTimeout(() => {
                    queue.splice(0, 1);
                    $('.sidebar').find('.item').first().remove();
                    nAlert = new Notification('"' + rqst.title + '" successfully converted!', {
                        body: "Click on the folder icon, to check it out!"
                    })
                }, 1000)
            })
        })
    } else {
        fileName = `${rqst.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`
        tracker = {
            start: Date.now(),
            audio: {
                downloaded: 0,
                total: '?'
            },
            video: {
                downloaded: 0,
                total: '?'
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
                quality: quality
            })
            .on('progress', (_, downloaded, total) => {
                tracker.video = {
                    downloaded,
                    total
                };
            });
        progressbar = setInterval(() => {
            let prog
            if (tracker.audio.downloaded + tracker.video.downloaded != tracker.audio.total + tracker.video.total) {
                prog = `${toMB(tracker.audio.downloaded + tracker.video.downloaded)}MB/${toMB(tracker.audio.total + tracker.video.total)}MB`
            } else {
                prog = 'Processing'
            }
            $('.sidebar').find('.item').first().find('span').first().text(`${cq(quality)} | ${prog} | ${Math.floor((Date.now() - tracker.start) / 1000)}s`);
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
                            body: "Click on the folder icon, to check it out!"
                        })
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
    }
}, 10000)