import { fetchFile, toBlobURL } from './node_modules/@ffmpeg/util/dist/esm/index.js';
import { FFmpeg } from './node_modules/@ffmpeg/ffmpeg/dist/esm/index.js';
// import { fetchFile, toBlobURL } from '@ffmpeg/util';
// import * from './node_modules/@ffmpeg/ffmpeg/dist/esm/index.js';
// console.log(FFmpeg)
// import * from './node_modules/@ffmpeg/util/dist/esm/index.js';
// console.log(fetchFile)
let o_ffmpeg = new FFmpeg();
console.log(o_ffmpeg);
// const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/esm'
const baseURL = window.location.origin
await o_ffmpeg.load({
    // coreURL: `./ffmpeg-core.js`,
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    // wasmURL: `./ffmpeg-core.wasm`,
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
});


let s_file_name_input = 'file_example_MP4_1920_18MG.mp4'
let s_file_name_output = 'output.mp4'
let s_test = `https://raw.githubusercontent.com/ffmpegwasm/testdata/master/Big_Buck_Bunny_180_10s.webm`;
await o_ffmpeg.writeFile(s_file_name_input, await fetchFile(window.location.origin+'/file_example_MP4_1920_18MG.mp4'));
// await o_ffmpeg.exec(['-i', 'input.webm', 'output.mp4']);
// await o_ffmpeg.exec([
//     '-i',
//     'input.webm',
//     `-filter_complex`,
//     `"[0:v]trim=00:03,setpts=PTS-STARTPTS[p1],[0:v]trim=00:05,setpts=PTS-STARTPTS[p2],[0:v]trim=0:08,[p1][p2]concat=n=2[out]"`,
//     `-map[out]`,
//     'output.mp4'
// ]);
// return    `ffmpeg -ss ${f_s_hms__from_n_ms(o_video_cut.n_ms_start)} -t ${f_s_hms__from_n_ms(o_video_cut.n_ms_length)} -i '${o_video_cut.o_file.o_js_file.name}' -c copy ${f_s_name_file(o_video_cut)}`
await o_ffmpeg.exec([
    `-ss`,
    `00:00:03.000`,
    `-t`,
    `00:00:02.000`,//duration
    '-i',
    s_file_name_input,
    `-c`,
    `copy`,
    'output.mp4'
]);
const data = await o_ffmpeg.readFile(s_file_name_output);
await o_ffmpeg.exec([
    `-ss`,
    `00:00:20.001`,
    `-t`,
    `00:00:03.000`,//duration
    '-i',
    s_file_name_input,
    `-c`,
    `copy`,
    'output2.mp4'
]);
const data2 = await o_ffmpeg.readFile(s_file_name_output);
// ffmpeg -i input.mp4 -ss 00:02:00 -t 00:07:28 part1.mp4

// await o_ffmpeg.writeFile('data', data);
// await o_ffmpeg.writeFile('data2', data2);
let utf8Encode = new TextEncoder();
await o_ffmpeg.writeFile('list.txt', utf8Encode.encode(`
file 'output.mp4'
file 'output2.mp4'
`));

await o_ffmpeg.exec(
    `-f concat -i list.txt -c copy concatted_1692827823272.mp4`.split(' ')
);
const datamerged = await o_ffmpeg.readFile(`concatted_1692827823272.mp4`);
// ffmpeg -i a.mkv -filter_complex  -map[out] b.mkv

let o_el_vid = document.createElement("video");
o_el_vid.controls = true
document.body.appendChild(o_el_vid);
o_el_vid.src =
    URL.createObjectURL(new Blob([datamerged.buffer], {type: 'video/mp4'}));

// import * from "https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd/ffmpeg-core.js"
// const load = async () => {
//     const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd'
//     const ffmpeg = ffmpegRef.current;
//     ffmpeg.on('log', ({ message }) => {
//         messageRef.current.innerHTML = message;
//         console.log(message);
//     });
//     // toBlobURL is used to bypass CORS issue, urls with the same
//     // domain can be used directly.
//     await ffmpeg.load({
//         coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
//         wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
//     });
//     setLoaded(true);
// }

// const transcode = async () => {
//     const ffmpeg = ffmpegRef.current;
//     await ffmpeg.writeFile('input.webm', await fetchFile('https://raw.githubusercontent.com/ffmpegwasm/testdata/master/Big_Buck_Bunny_180_10s.webm'));
//     await ffmpeg.exec(['-i', 'input.webm', 'output.mp4']);
//     const data = await ffmpeg.readFile('output.mp4');
//     videoRef.current.src =
//         URL.createObjectURL(new Blob([data.buffer], {type: 'video/mp4'}));
// }

