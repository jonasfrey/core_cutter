import {f_o_html__and_make_renderable} from "https://deno.land/x/f_o_html_from_o_js@2.1/mod.js";
import {
    f_add_css,
    f_s_css_prefixed, 
    o_variables as o_variables_css, 
    f_s_css_from_o_variables
} from "https://deno.land/x/f_add_css@1.1/mod.js"

import * as o_wave_surfer from './WaveSurfer.module.js'

window.o_wave_surfer = o_wave_surfer
// ffmpeg for javascript made with wasm webassebmly 
import { fetchFile, toBlobURL } from './node_modules/@ffmpeg/util/dist/esm/index.js';
import { FFmpeg } from './node_modules/@ffmpeg/ffmpeg/dist/esm/index.js';
let o_ffmpeg = new FFmpeg();

o_ffmpeg.on('log', ({ message }) => {
    // console.log(`%c FFMPEGWASM:`, `color:blue;font-weight:bold;`);
    console.log(message)
});
let f_execute_ffmpeg_command = async function(a_s_command){
    console.log('executing the following ffmpeg command')
    console.log(`ffmpeg ${a_s_command.join(' ')}`)
    console.log(`---`)

    return o_ffmpeg.exec.apply(null, arguments)
}
// console.log(o_ffmpeg);
// const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/esm'
const baseURL = window.location.origin
await o_ffmpeg.load({
    // coreURL: `./ffmpeg-core.js`,
    // wget https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js
    // wget https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.min.js
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.min.js`, 'text/javascript'),
    // wasmURL: `./ffmpeg-core.wasm`,
    // wget https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
});



let f_download_file = function(
    s_name_file, 
    v_content, 
    s_mime_type = 'plain/text'
){

    // Create a Blob object
    const blob = new Blob([v_content], { type: 'plain/text' });
    // Create an object URL
    const url = URL.createObjectURL(blob);
    // Create a new link
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = s_name_file;
    // Append to the DOM
    document.body.appendChild(anchor);
    // Trigger `click` event
    anchor.click();
    // Remove element from DOM
    document.body.removeChild(anchor);
    // Release the object URL
    URL.revokeObjectURL(url);

}

// f_download_file("lol.txt", 'this is lol')


let o_state = {
    b_play_cuts: false,
    n_o_file_n_id: 0,
    a_o_file: [],
    o_file: null,
    o_playhead_file: null,
    n_ms_per_px: 10,
    n_ms_playhead: 0,
    b_mouse_down_o_scrollbar: false,
    o_trn_mouse_down: {n_x:0, n_y:0},
    o_trn_mouse_up: {n_x:0, n_y:0},
    o_trn_mouse_move: {n_x:0, n_y:0},
    a_o_video_cut: [], 
    o_video_cut__before_playhead: null, 
    o_video_cut__current_playhead: null, 
    o_video_cut__after_playhead: null, 
    a_n_ms_cut: [], 
    n_ms_cut__closest_to_playhead: 0, 
    b_prevent_on_seeking_call_because_current_time_change : false,
    n_id_recursive_function_call: 0,
    n_ms_max_diff_recursive_function_call: 1000/60,
    n_ms_wpn_last_recursive_function_call: window.performance.now(),
    n_ms_max_diff_update_video_currentTime: 1000/6,
    n_ms_wpn_last_update_video_currentTime: window.performance.now(),

    v_o_vid: null, 
};
window.o_state = o_state

let o_o_js = {};
let f_o_js_from_s_name = function(s_name, o){
    if(!o_o_js[s_name]){
        o_o_js[s_name] = o
    }else{
        return o_o_js[s_name]
    }
    return o
}


function f_a_u_f32__from_wav_file(wavUint8Array) {
    const buffer = wavUint8Array.buffer;

    // Assuming data starts at byte 44, which is typical for WAVs without additional chunks in the header.
    const audioDataStart = 44;
    const int16Array = new Int16Array(buffer, audioDataStart);

    // Convert 16-bit PCM data to Float32
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 0x8000;  // Normalize to [-1, 1]
    }

    return float32Array;
}


class O_file {
    constructor(         
        o_js_file,
    ){
        this.n_id = o_state.n_o_file_n_id +1;
        o_state.n_o_file_n_id = this.n_id;
        this.o_js_file = o_js_file
        this.b_loaded = false;
        this.s_src_object_url = null;
        this.n_ms_length = null;
        this.n_scl_x__px = null;
        this.n_scl_y__px = null;
        this.a_n_u8__audio_wav = null;
        this.o_wavesurfer = null;
    }
}
class O_video_cut {
    constructor(
        o_file, 
        n_ms_start, 
        n_ms_length, 
        n_ms_start_absolute,
        n_id_video, 
    ){
        this.o_file = o_file
        this.n_ms_start = n_ms_start
        this.n_ms_length = n_ms_length
        this.n_ms_start_absolute = n_ms_start_absolute
        this.n_id_video = n_id_video
    }
}


let f_s_version_suffix = function(s_version_with_dot){
    let s_version_without_dot = s_version_with_dot.replaceAll(".", "_");
    return `v_${s_version_without_dot}`;
}
let s_version = `0.1`;
let s_id_video = `o_file_video_${crypto.randomUUID()}`;
let f_v_o_vid = ()=>{return document.querySelector(`#${s_id_video}`)};
let f_update_o_state_n_ms_playhead = function(n_ms, b_update_video_current_time = true){

    console.log(`f_update_o_state_n_ms_playhead called with args`)
    // console.log(arguments)

    o_state.v_o_vid = f_v_o_vid();
    o_state.o_playhead_file = f_o_playhead_file(n_ms);
    o_state.n_ms_playhead = n_ms;

    let n_ms_cut__closest_to_playhead_last = o_state.n_ms_cut__closest_to_playhead;
    let n_ms_delta_min = Math.abs(o_state.n_ms_playhead - o_state.a_n_ms_cut?.[0]);
    o_state.n_ms_cut__closest_to_playhead = o_state.a_n_ms_cut?.[0];
    for(let n_ms_cut of o_state.a_n_ms_cut){
        let n_ms_delta = Math.abs(o_state.n_ms_playhead - n_ms_cut);
        // console.log(n_ms_delta)
        if(n_ms_delta < n_ms_delta_min){
            n_ms_delta_min = n_ms_delta
            o_state.n_ms_cut__closest_to_playhead = n_ms_cut;
        }
    }


    if(o_state.o_playhead_file.o_file != o_state.o_file){
        o_state.o_file = o_state.o_playhead_file.o_file;
        o_o_js?.o_js__video?._f_render();
    }
    if(b_update_video_current_time){
        let n_ms = o_state.n_ms_wpn_last_update_video_currentTime - window.performance.now();
        if(Math.abs(n_ms) > o_state.n_ms_max_diff_update_video_currentTime){
            if(o_state.v_o_vid){
                o_state.v_o_vid.currentTime = o_state.o_playhead_file.n_ms_playhead_relative / 1000;
                o_state.n_ms_wpn_last_update_video_currentTime = window.performance.now();
                console.log(`updated currentTime: ${o_state.v_o_vid.currentTime}`)
            }
        }
    }else{
        let o_el_scrollbar = document.querySelector(".o_scrollbar");
        let n_ms_length_total = f_n_ms_length_total()
        let n_ms_nor = n_ms / n_ms_length_total;
        let n_x_px_scroll_max = o_el_scrollbar?.scrollWidth-o_el_scrollbar?.clientWidth;
        let n_x_px =  n_x_px_scroll_max * n_ms_nor; 

        o_el_scrollbar?.scrollTo(n_x_px,0);

    }

    o_state.o_playhead_file.n_ms_playhead_relative = o_state.v_o_vid.currentTime*1000;


    o_state.o_video_cut__before_playhead = o_state.a_o_video_cut.filter(
        o=> o.n_ms_start_absolute + o.n_ms_length <= o_state.n_ms_playhead 
    ).at(-1);

    o_state.o_video_cut__current_playhead = o_state.a_o_video_cut.find(
        o=> o.n_ms_start_absolute < o_state.n_ms_playhead && (o.n_ms_start_absolute + o.n_ms_length) > o_state.n_ms_playhead
    );
    
    o_state.o_video_cut__after_playhead = o_state.a_o_video_cut.find(
        o=> o.n_ms_start_absolute >= o_state.n_ms_playhead
    );

    o_o_js?.o_js__a_o_file?._f_render()
    o_o_js?.o_js__current_video_global_time_range_slider?._f_update();
    o_o_js?.o_js__current_video_status?._f_update();

}

let f_n_ms_video_current_time_absolute = function(){
    let n_ms_length_total = 0;
    for(let o_file of o_state?.a_o_file){
        if(o_file == o_state?.o_file){
            break;
        }
        n_ms_length_total += o_file.n_ms_length;
    }

    return n_ms_length_total + o_state?.o_playhead_file?.n_ms_playhead_relative 

}

let f_recursive_f_set_n_ms_playhead = function(){
    
    o_state.n_id_recursive_function_call = window.requestAnimationFrame(f_recursive_f_set_n_ms_playhead)
    let n_ms_diff = window.performance.now()-o_state.n_ms_wpn_last_recursive_function_call;

    if(Math.abs(n_ms_diff > o_state.n_ms_max_diff_recursive_function_call)){
        let n_ms_video_current_time_absolute = f_n_ms_video_current_time_absolute();
        let n_ms_playhead = n_ms_video_current_time_absolute;
    
        // console.log(`f_recursive_f_set_n_ms_playhead called with args`)
        // console.log(arguments)
    
        if(o_state.b_play_cuts){
            // console.log('o_state.o_video_cut__current_playhead')
            // console.log(o_state.o_video_cut__current_playhead)
            // console.log('o_state.o_video_cut__after_playhead')
            // console.log(o_state.o_video_cut__after_playhead)
            if(!o_state.o_video_cut__current_playhead && o_state.o_video_cut__after_playhead){
                //n_ms_playhead = o_state.o_video_cut__after_playhead.n_ms_start_absolute
                f_update_o_state_n_ms_playhead(
                    o_state.o_video_cut__after_playhead.n_ms_start_absolute+1,
                    true
                );
                return 
            }
            if(!o_state.o_video_cut__current_playhead && !o_state.o_video_cut__after_playhead){
                o_state.v_o_vid?.pause();
            }
        }
    
        f_update_o_state_n_ms_playhead(
            n_ms_playhead,
            false
        );
        o_state.n_ms_wpn_last_recursive_function_call = window.performance.now()

    }
    
}

    

    let f_n_ms_length_total = function(){
        return o_state.a_o_file.reduce(
            (n_acc, o_file)=>{return n_acc + o_file.n_ms_length},
            0
        )
    }
    let b_mouse_down = false;
    let b_video_was_playing = false;
    window.onpointerdown = (o_e)=>{
        if(!o_state.v_o_vid?.paused){
            b_video_was_playing = true
            o_state.v_o_vid?.pause();
        }else{
            b_video_was_playing = false
        }
        o_state.o_trn_mouse_down.n_x = o_e.clientX;
        o_state.o_trn_mouse_down.n_y = o_e.clientY;

        o_state.b_prevent_on_seeking_call_because_current_time_change = true
                                        
        o_state.b_mouse_down_o_scrollbar = true
        // document.querySelector("video")?.pause();

        o_state.o_trn_mouse_move = {
            n_x: o_e.clientX,
            n_y: o_e.clientY
        };

        b_mouse_down = true
    
    };
    window.onpointerup = (o_e)=>{
        if(b_video_was_playing){
            o_state.v_o_vid?.play();
        }
        b_mouse_down = false
        o_state.b_mouse_down_o_scrollbar = false
        o_state.b_prevent_on_seeking_call_because_current_time_change = false
        o_state.o_trn_mouse_up.n_x = o_e.clientX;
        o_state.o_trn_mouse_up.n_y = o_e.clientY;

    };

    window.onmousemove = function(o_e){
        // if(!o_e.target.className.includes('slider_big_horizontal')){
        //     return false
        // }
        let n_x = o_state.o_trn_mouse_move.n_x - o_e.clientX;
        let n_ms = n_x * o_state.n_ms_per_px;
        // if(!o_state.b_mouse_down_o_scrollbar){
        //     o_state.o_trn_mouse_move = false;
        // }
        console.log(b_mouse_down)
        if(b_mouse_down){
            
            o_state.o_trn_mouse_move = {
                n_x: o_e.clientX,
                n_y: o_e.clientY
            };
            document.querySelector(".o_scrollbar").scrollLeft = document.querySelector(".o_scrollbar").scrollLeft + n_x;
        }
    }
    window.onwheel = function(o_e){

        if(o_state.v_o_vid){
            let n_nor = o_e.deltaY / 100;
            let n_new = o_state.v_o_vid.playbackRate + (n_nor/10);
            o_state.v_o_vid.playbackRate = Math.max(0.1, n_new);
            o_o_js?.o_js__current_video_status?._f_update()
        }
    }

    class O_playhead_file{
        constructor(
            n_ms_playhead_absolute,
            n_ms_playhead_relative,
            o_file, 
            v_o_file__before,
            v_o_file__after
        ){
            this.n_ms_playhead_absolute = n_ms_playhead_absolute,
            this.n_ms_playhead_relative = n_ms_playhead_relative,
            this.o_file = o_file
            this.v_o_file__before = v_o_file__before
            this.v_o_file__after = v_o_file__after
        }
    }
    let f_o_playhead_file = function(
        n_ms_playhead_absolute
    ){
        let n_ms_playhead_relative = n_ms_playhead_absolute;

        let n_ms_length_total = 0;
        let n_idx_a_o_file = 0; 
        let o_file = o_state.a_o_file.find(
            (o_file, n_idx)=>{
                let n_ms_length_total_new = n_ms_length_total + o_file.n_ms_length;
                if(
                    n_ms_playhead_absolute >= n_ms_length_total 
                     && n_ms_playhead_absolute <= n_ms_length_total_new
                ){
                    n_idx_a_o_file = n_idx
                    return true
                }
                n_ms_playhead_relative = n_ms_playhead_relative - o_file.n_ms_length; 
                n_ms_length_total = n_ms_length_total_new;
            }
        )
        let n_idx_a_o_file__before = n_idx_a_o_file-1
        let n_idx_a_o_file__after = n_idx_a_o_file+1
        if(n_idx_a_o_file__before >= 0){} 
        // console.log('playhead o_file.o_js_file')
        // console.log(o_file.o_js_file)
        return new O_playhead_file(
            n_ms_playhead_absolute, 
            n_ms_playhead_relative, 
            o_file, 
            (n_idx_a_o_file__before >= 0)? o_state.a_o_file[n_idx_a_o_file__before]: null,
            (n_idx_a_o_file__after < o_state.a_o_file.length)? o_state.a_o_file[n_idx_a_o_file__after]: null,
        )
    }

    let f_update_a_o_video_cut = function(){
        o_state.a_n_ms_cut = o_state.a_n_ms_cut.sort((n1,n2)=>n1-n2);
        let b_mod_one = true;
        o_state.a_o_video_cut = o_state.a_n_ms_cut.map(
            (n_ms_cut, n_idx) => {
                if(n_idx % 2 == ((b_mod_one)?1:0)){
                    let n_ms_cut__last = o_state.a_n_ms_cut[n_idx-1];
                    let o_playhead_file_last = f_o_playhead_file(n_ms_cut__last);
                    let o_playhead_file = f_o_playhead_file(n_ms_cut);
                    console.log(o_playhead_file.o_file.o_js_file)
                    if(o_playhead_file_last.o_file != o_playhead_file.o_file){
                        b_mod_one = !b_mod_one
                        return false
                    }
                    let n_ms_length = n_ms_cut - n_ms_cut__last
                    console.log(o_playhead_file.o_file.o_js_file)
                    return new O_video_cut(
                        o_playhead_file.o_file,
                        o_playhead_file_last.n_ms_playhead_relative,
                        n_ms_length, 
                        n_ms_cut__last, 
                        o_state.a_o_file.indexOf(o_playhead_file.o_file),
                    );

                }
                return false
            }
        ).filter(v=>v)
    }
    let f_jump_n_ms_cut__next = function(){

        let n_ms_cut__next = o_state.a_n_ms_cut.sort((n1,n2)=>n1-n2).find(n=>parseInt(n)>parseInt(o_state.n_ms_playhead));
        if(n_ms_cut__next){
            f_update_o_state_n_ms_playhead(n_ms_cut__next, true);
        }
    };
    let f_jump_n_ms_cut__prev = function(){

        let n_ms_cut__prev = o_state.a_n_ms_cut.sort((n1,n2)=>n1-n2).reverse().find(n=>parseInt(n)<parseInt(o_state.n_ms_playhead));
        if(n_ms_cut__prev){
            f_update_o_state_n_ms_playhead(n_ms_cut__prev, true);
        }
    };

    let f_remove_cut = function(n_ms_cut){
        
        o_state.a_n_ms_cut = o_state.a_n_ms_cut.sort((n1,n2)=>n1-n2)
        let n_idx = o_state.a_n_ms_cut.indexOf(n_ms_cut);
        if(n_idx!= -1){
            o_state.a_n_ms_cut.splice(n_idx, 1);
        }
        o_state.a_n_ms_cut = o_state.a_n_ms_cut.sort((n1,n2)=>n1-n2);
        f_update_a_o_video_cut();
        o_o_js?.o_js__a_o_file?._f_render();
    }
    let f_cut = function(){
        o_state.a_n_ms_cut.push(
            o_state.n_ms_playhead
        );
        o_state.a_n_ms_cut = o_state.a_n_ms_cut.sort((n1,n2)=>n1-n2)
        f_update_a_o_video_cut();
        o_o_js?.o_js__a_o_file?._f_render();
        console.log(o_state.a_o_video_cut.map(o=>o.o_file.o_js_file.name));
    }
    let a_n_keycode_keydown_last = [];
    let f_keyup = function(){
        a_n_keycode_keydown_last = a_n_keycode_keydown_last.filter(n=>n!=window.event.keyCode);

    }
    let f_keydown = function(){

        a_n_keycode_keydown_last.push(window.event.keyCode);
        let f_n_keycode = (s_char)=>{return s_char.toUpperCase().charCodeAt(0)};
        if(window.event.keyCode == f_n_keycode('s')){
            f_cut()
        }
        if(window.event.keyCode == f_n_keycode('a')){
            f_remove_cut(o_state.n_ms_cut__closest_to_playhead)
        }
        let n_ms_one_frame_assumed = 1000/30;//30 fps
        if(window.event.keyCode == f_n_keycode('q')){
            f_update_o_state_n_ms_playhead(Math.max(o_state.n_ms_playhead - n_ms_one_frame_assumed, 0));
        }
        if(window.event.keyCode == f_n_keycode('e')){
            f_update_o_state_n_ms_playhead(Math.min(o_state.n_ms_playhead + n_ms_one_frame_assumed, f_n_ms_length_total()));
        }
        if(window.event.keyCode == f_n_keycode('d')){
            f_update_o_state_n_ms_playhead(Math.max(o_state.n_ms_playhead - n_ms_one_frame_assumed*3, 0));
        }
        if(window.event.keyCode == f_n_keycode('f')){
            f_update_o_state_n_ms_playhead(Math.min(o_state.n_ms_playhead + n_ms_one_frame_assumed*3, f_n_ms_length_total()));
        }
        if(window.event.keyCode == f_n_keycode('q')){
            f_jump_n_ms_cut__prev()
        }
        if(window.event.keyCode == f_n_keycode('w')){
            f_jump_n_ms_cut__next()
        }
        console.log('keydown')
        if(
            window.event.keyCode == f_n_keycode(' ')
            // !a_n_keycode_keydown_last.includes(f_n_keycode(' ')) 
            //  && window.event.keyCode ==f_n_keycode(' ') 
        ){

            if(o_state.v_o_vid?.paused){
                o_state.v_o_vid?.play()
            }else{
                o_state.v_o_vid?.pause()
            }
        }
    }
    document.onkeyup = function(){
        f_keyup();
    }
    document.onkeydown = function(){
        f_keydown();
    }
    
    
    let f_set_n_ms_per_px = function(n_ms_per_px){
        o_state.n_ms_per_px = n_ms_per_px;
        o_o_js?.o_js__a_o_file?._f_render();
        f_update_o_state_n_ms_playhead(o_state.n_ms_playhead);

    }
    let f_s_hms__from_n_ms = function(n_ms){
        let n_hours = (((n_ms / 1000) / 60) / 60)
        let n_minutes = (n_hours - parseInt(n_hours)) * 60;
        let n_seconds = ((n_ms / 1000) % 60)
        
        return `${(''+parseInt(n_hours)).padStart(2, '0')}:${(''+parseInt(n_minutes)).padStart(2, '0')}:${(''+(n_seconds.toFixed(3))).padStart(6, '0')}`
        // format 02.250
    }
    let f_s_name_file__from_o_video_cut = function(o_video_cut){
        let n_idx = o_state.a_o_video_cut.indexOf(o_video_cut);

        let a_s_part = o_video_cut.o_file.o_js_file.name.split(".");
        let s_ext = a_s_part.pop()
        let s_file_name_no_ext = `${a_s_part.join('.')}_cut`.replaceAll(/[^a-zA-Z0-9%]/g, '');

        let s_name = encodeURIComponent(`${s_file_name_no_ext}_${o_video_cut.n_id_video}_${n_idx}.${s_ext}`);
        return s_name
    }

    let f_render_and_download = async function(){

        let b_merge_files = o_state.a_o_video_cut.length == 0 && o_state.a_o_file.length
        let b_merge_cuts = o_state.a_o_video_cut.length > 0
        if(
            !b_merge_files && !b_merge_cuts
            ){
            alert("you must at least have  two cuts that make up a segment or two video files that are going to be merged")
            return 
        }
        let n_ts = new Date().getTime()
        let s_file_name__default = `concatted_${n_ts}.mp4`
        let a_s_part = o_state?.o_playhead_file?.o_file?.o_js_file?.name.split(".");
        let s_ext = a_s_part.pop()
        s_file_name__default = `${a_s_part.join('.')}_cut.${s_ext}`

        let s_name_file_exported = encodeURIComponent(prompt("file name:", s_file_name__default));

        let n_scl_x__px__max = 0;
        let n_scl_y__px__max = 0;

        for(let o_file of o_state.a_o_file){
            if(o_file.n_scl_x__px > n_scl_x__px__max){
                n_scl_x__px__max = o_file.n_scl_x__px
            }
            if(o_file.n_scl_y__px > n_scl_y__px__max){
                n_scl_y__px__max = o_file.n_scl_y__px
            }
        }
        let f_s_name_file_out = function(s_file_name){
            let a_s_part = s_file_name.split(".");
            let s_ext = a_s_part.pop();

            return `${encodeURIComponent(a_s_part.join("."))}_out.${s_ext}`
        }


        // write files to ffmpeg virtual file system, 
        // if the file resolution does not match the maximum frame 
        // it will get resized keeping the aspect ratio and filling the empty spaces with black borders
        await Promise.all(
            o_state.a_o_file.map(
                async o_file => {
                    let s_name_file_out = f_s_name_file_out(o_file.o_js_file.name);
                    if(
                        o_file.n_scl_x__px != n_scl_x__px__max
                        &&
                        o_file.n_scl_y__px != n_scl_y__px__max
                    ){
                        // bring smaller file to correct scale
                        let s_command = `-i ${encodeURIComponent(o_file.o_js_file.name)} -vf scale=${n_scl_x__px__max}:${n_scl_y__px__max}:force_original_aspect_ratio=decrease,pad=${n_scl_x__px__max}:${n_scl_y__px__max}:-1:-1:color=black ${s_name_file_out}`;
                        return f_execute_ffmpeg_command(
                            s_command.split(" ")
                        );
                    }else{
                        return o_ffmpeg.writeFile(
                            s_name_file_out,
                            new Uint8Array((await o_file.o_js_file.arrayBuffer()))
                        );
                    }
                }
            )
        )
        console.log('current o_ffmpeg virtual dir (.): ')
        console.log(await o_ffmpeg.listDir('.'))
        
        let a_s_name_file__for_merging = o_state.a_o_file.map(
            o_file => {
                let s_name_file_out = f_s_name_file_out(o_file.o_js_file.name);
                return s_name_file_out
            }
        );

        if(b_merge_cuts){
            a_s_name_file__for_merging = o_state.a_o_video_cut.map(
                (o_video_cut, n_idx_o_video_cut)=>{
                    return f_s_name_file__from_o_video_cut(o_video_cut)
                }
            )
            await Promise.all(
                o_state.a_o_video_cut.map(
                    (o_video_cut, n_idx_o_video_cut)=>{

                        // we take the inputfile (which could be already processed therefore having an output name) from before 
                        let s_name_file_out = f_s_name_file_out(o_video_cut.o_file.o_js_file.name);

                        // return    `ffmpeg -i ${o_video_cut.o_file.o_js_file.name} -ss ${f_s_hms__from_n_ms(o_video_cut.n_ms_start)} -t ${f_s_hms__from_n_ms(o_video_cut.n_ms_length)} -c:v copy -c:a copy ${o_video_cut.n_id_video}_${n_idx_o_video_cut}.mp4`
                        // return `mencoder -ss ${f_s_hms__from_n_ms(o_video_cut.n_ms_start)} -endpos ${f_s_hms__from_n_ms(o_video_cut.n_ms_length)} -oac pcm -ovc copy ${o_video_cut.o_file.o_js_file.name} -o ${s_file_name}`
                        // return    `-ss ${f_s_hms__from_n_ms(o_video_cut.n_ms_start)} -t ${f_s_hms__from_n_ms(o_video_cut.n_ms_length)} -i '${o_video_cut.o_file.o_js_file.name}' -c copy ${f_s_name_file__from_o_video_cut(o_video_cut)}`   
                        return f_execute_ffmpeg_command([
                            `-ss`,
                            f_s_hms__from_n_ms(o_video_cut.n_ms_start),
                            `-t`,
                            f_s_hms__from_n_ms(o_video_cut.n_ms_length),//duration
                            '-i',
                            `${s_name_file_out}`,
                            `-c`,
                            `copy`,
                            f_s_name_file__from_o_video_cut(o_video_cut)
                        ])
                    }
                )
            )
            
        }
        let s_name_file_list = 'list.txt' 
        let utf8Encode = new TextEncoder();
        await o_ffmpeg.writeFile(s_name_file_list, utf8Encode.encode(
            a_s_name_file__for_merging.map(
                (s)=>{
                    return `file '${s}'`
                }
            ).join('\n')
        ));



        
        await f_execute_ffmpeg_command(
            `-f concat -i ${s_name_file_list} -c copy ${s_name_file_exported}`.split(' ')
        );
        const a_n_u8_file_exported = await o_ffmpeg.readFile(s_name_file_exported);
        
        f_download_file(
            decodeURIComponent(s_name_file_exported), 
            a_n_u8_file_exported.buffer, 
            'video/mp4'
        )

    }

    let o = {
        class: "position_relative d_flex h_100vh",
        a_o:[
            {
                style: `display:${(window.chrome) ? "none":'block'}`,
                innerText: "This app only works with chromium based browsers"
            },
            f_o_js_from_s_name(
                'o_js__video', 
                {
                    f_o_jsh: function(){
                        return {
                            class: "video",
                            a_o: [
                                {
                                    class: "o_video_preview",
                                    s_tag: "video", 
                                    preload: "auto",
                                    id: s_id_video,
                                    src: o_state?.o_file?.s_src_object_url,
                                    // controls: "false",// those damn fcking controls, event listeners do not work on them, for example if you browse through the video keydown wont work after you clicked the range input slider 
                                    onplay: function(){
                                        o_state.n_id_recursive_function_call = window.requestAnimationFrame(f_recursive_f_set_n_ms_playhead)
                                    },
                                    onpause: function(){
                                        window.cancelAnimationFrame(o_state.n_id_recursive_function_call)
                                        o_state.b_play_cuts = false;
                                    },
                                    onended: function(){
            
                                        if(o_state.o_playhead_file.v_o_file__after){
                                            f_update_o_state_n_ms_playhead(o_state.n_ms_playhead+(1000/30), true);
                                            o_state.v_o_vid?.play()
                                        }
                                    }
                                }, 
                                f_o_js_from_s_name(
                                    'o_js__current_video_status', 
                                    {
                                        f_o_jsh: function(){
                                            return {
                                                style: `
                                                position: absolute;
                                                top: 0;
                                                right: 0;
                                                font-size: 1rem;
                                                padding: 0.3rem;`,
                                                innerText: `
                                                ${o_state?.o_playhead_file?.o_file?.o_js_file?.name}
                                                speed: ${o_state?.v_o_vid?.playbackRate}
                                                (assuming 24fps)
                                                frame: ${parseInt(
                                                    ((o_state?.o_playhead_file?.n_ms_playhead_relative)/1000)*24
                                                )}
                                                `
                                            }
                                        }
                                    }
                                ),
                                f_o_js_from_s_name(
                                    'o_js__current_video_global_time_range_slider', 
                                    {
                                        f_o_jsh: function(){
                                            // console.log('o_js__current_video_global_time_range_slider render')
                                            return {
                                                class: "slider_big_horizontal",
                                                style: `
                                                position:absolute;
                                                bottom: 0;
                                                width: 100%;`,
                                                id: "asdf",
                                                s_tag: 'input', 
                                                type: 'range', 
                                                min: 0, 
                                                max: 1, 
                                                step: 0.01, 
                                                value: 
                                                o_state?.o_playhead_file?.n_ms_playhead_relative / o_state?.o_playhead_file?.o_file?.n_ms_length, 
                                                oninput: function(o_e){
                                                    // this was the old onseeking but the global event listeners dont work on that fkcing video range input 
                                                    if(o_state?.b_prevent_on_seeking_call_because_current_time_change){
                                                        return false;
                                                    }
                                                    let n_nor = parseFloat(o_e.target.value)

                                                    if(o_state?.v_o_vid){
                                                        o_state.v_o_vid.currentTime = n_nor* o_state?.v_o_vid.duration;
    
                                                        // console.log("onseeking called (will be also called when currentTime changes)")
                                                        let n_ms_length_total = 0;
                                                        for(let o_file of o_state?.a_o_file){
                                                            if(o_file == o_state?.o_file){
                                                                break;
                                                            }
                                                            n_ms_length_total += o_file.n_ms_length;
                                                        }
                                                        
                                                        f_update_o_state_n_ms_playhead(n_ms_length_total+o_state?.v_o_vid.currentTime*1000, false);
                                                        
                                                    }



                                                }
                                            }
                                        }
                                    }
                                ),
                            ]
                        }
                    }
                }
            ),
            {
                class: "o_w_100", 

                a_o: [
                    {
                        class: "o_playhead disable_select", 
                    },
                    f_o_js_from_s_name(
                        'o_js__o_scrollbar', 
                        {
                            f_o_jsh: function(){
                                return {
                                    class: "o_scrollbar disable_select", 
                                    a_o: [ 
                                        f_o_js_from_s_name(
                                            'o_js__a_o_file', 
                                            {
                                                f_o_jsh: function(){
                                                    let o_js_spacer = {
                                                        class: "spacer length",
                                                        style: (function(){
                                                            let n_px_target = document.querySelector(".o_scrollbar")?.clientWidth/2;
                                                            // let n_ms = o_state.n_ms_per_px * n_px_target;
                                                            return `flex:0 0 ${n_px_target}px`
                                                        })(), 
                                                    }
                                                    return {
                                                        class: "a_o_file length",       
                                                        a_o: [
                                                            o_js_spacer,
                                                            ...o_state.a_o_file.map(
                                                                function(o_file){
                                                                    return {
                                                                        style: (function(){
                                                                            return `flex:0 0 ${o_file.n_ms_length / o_state.n_ms_per_px}px`
                                                                        })(), 
                                                                        class: "o_file length bar_pole_pattern", 
                                                                        a_o:[
                                                                            {
                                                                                s_tag: "img", 
                                                                                class: 'waveform disable_select',

                                                                                src: o_file?.s_audio_waveform_image_dataurl,
                                                                                // style: 'height: 100%;',
                                                                                // id: `${btoa(o_file.o_js_file.name)}`
                                                                            }
                                                                        ]
                                                                    }
                                                                }
                                                            ),
                                                            ...o_state.a_n_ms_cut.map(
                                                                function(n_ms_cut){
                                                                    return {
                                                                        style: (function(){
                                                                            return `left:${n_ms_cut / o_state.n_ms_per_px + (document.querySelector(".o_scrollbar")?.clientWidth/2)}px`
                                                                        })(), 
                                                                        class: `n_ms_cut ${(o_state.n_ms_cut__closest_to_playhead == n_ms_cut)?'n_ms_cut__closest_to_playhead': ''}`
                                                                    }
                                                                }
                                                            ),
                                                            ...o_state.a_o_video_cut.map(
                                                                function(o_video_cut){
                                                                    return {
                                                                        style: (function(){
                                                                            return [
                                                                                `left:${o_video_cut.n_ms_start_absolute / o_state.n_ms_per_px + (document.querySelector(".o_scrollbar")?.clientWidth/2)}px`,
                                                                                `width:${o_video_cut.n_ms_length / o_state.n_ms_per_px}px`,
                                                                            ].join(";")
                                                                        })(), 
                                                                        class: [
                                                                            `${(o_video_cut == o_state.o_video_cut__before_playhead)? 'before': ''}`, 
                                                                            `${(o_video_cut == o_state.o_video_cut__current_playhead)? 'current': ''}`, 
                                                                            `${(o_video_cut == o_state.o_video_cut__after_playhead)? 'after': ''}`,
                                                                            `o_video_cut`
                                                                        ].join(" ")
                                                                    }
                                                                }
                                                            ),
                                                            o_js_spacer 
                                                        ]
                                                        
                                                    }
                                                }
                                            }
                                        )
                                    ],

                                    
                                    onscroll: function(){
                                        if(o_state?.b_mouse_down_o_scrollbar){
                                            // console.log("scroll triggered")
                                            let n_trn_x_nor = this.scrollLeft / (this.scrollWidth-this.clientWidth)
                                            f_update_o_state_n_ms_playhead(n_trn_x_nor * f_n_ms_length_total());

                                        }
                                    }, 
                                }
                            }
                        }
                    ) 
                ]
            },
            {
                class: "buttons",
                a_o: [
                    {
                        s_tag: "input",
                        type: "range",
                        max: 5000, 
                        min: 16, // 1000/60 fps = 16 ms
                        step: 10, 
                        oninput: async function(){
                            f_set_n_ms_per_px(this.value)
                        }
                    },
                    // {
                    //     s_tag: "i",
                    //     class: "fa-regular fa-calendar icon clickable ",  
                    //     innerText: "zoom +", 
                    //     onclick: async function(){

                    //         f_set_n_ms_per_px(Math.min(0.2, o_state.n_ms_per_px+0.01))

                    //     }
                    // }, 
                    {
                        s_tag: "button", 
                        class: "clickable",
                        innerText: "play cuts", 
                        onclick: async function(){
                            o_state.b_play_cuts = true;
                            if(o_state.o_video_cut__after_playhead){
                                document.querySelector("video")?.play()
                                // f_update_o_state_n_ms_playhead(
                                //     o_state.o_video_cut__after_playhead.n_ms_start_absolute,
                                //     false
                                // );
                                // let vid = document.querySelector("video");
                                // vid?.play()

                            }
                        }
                    },
                    {
                        s_tag: "button", 
                        class: "clickable",
                        innerText: "cut ('s')", 
                        onclick: async function(){
                            f_cut();
                            
                        }
                    },
                    {
                        s_tag: "button", 
                        class: "clickable",
                        innerText: "jmp prv cut ('q')", 
                        onclick: async function(){
                            f_jump_n_ms_cut__next();
                        }
                    },
                    {
                        s_tag: "button", 
                        class: "clickable",
                        innerText: "jmp nxt cut ('w')", 
                        onclick: async function(){
                            f_jump_n_ms_cut__prev();
                        }
                    },
                    {
                        s_tag: "button", 
                        class: "clickable",
                        innerText: "remove cut ('a')", 
                        onclick: async function(){

                            f_remove_cut(o_state.n_ms_cut__closest_to_playhead);
                            
                        }
                    },
                    {
                        s_tag: "button", 
                        class: "clickable",
                        innerText: "export (.mp4)", 
                        onclick: async function(){
                            f_render_and_download();
                        }
                    },
                    f_o_js_from_s_name(
                        'o_js__filepicker', 
                        {
                            f_o_jsh: function(){
                                return {
                                    s_tag: "div", 
                                    class: "clickable",
                                    innerText: "add file(s) +", 
                                    onclick: async function(){
                    
                                        let a_o_file_handle = await window.showOpenFilePicker(
                                            {
                                                types: [
                                                  {
                                                    description: "videos",
                                                    accept: {
                                                      "video/*": [".mp4" ],
                                                    },
                                                  },
                                                ],
                                                excludeAcceptAllOption: true,
                                                multiple: true,
                                              }
                                        );
                                        for(let o_file_handle of a_o_file_handle){
                    
                                            let o_file = new O_file(await o_file_handle.getFile());
                                            o_state.a_o_file.push(o_file);
                                            
                                            let s_video_src_object_url = URL.createObjectURL(o_file.o_js_file);
                                            var o_reader = new FileReader();
                                            o_reader.onload = function() {
                                                o_file.b_loaded = true;
                                                o_file.s_src_object_url = s_video_src_object_url;
                                                
                                                o_o_js?.o_js__video._f_render();
                                                // let o_el_video = document.querySelector("#o_file_video");
                                                let o_el_video = document.createElement("video");
                                                // document.body.appendChild(o_el_video)
                                                // o_el_video.controls = true;
                                                o_el_video.onloadeddata = async function(){
                                                    o_file.n_ms_length = o_el_video.duration * 1000;   
                                                    o_file.n_scl_x__px = o_el_video.videoWidth   
                                                    o_file.n_scl_y__px = o_el_video.videoHeight
                                                    f_update_o_state_n_ms_playhead(o_state.n_ms_playhead);
                                                    o_o_js?.o_js__video?._f_render();
                                                    let s_name_audio_out = `${encodeURIComponent(o_file.o_js_file.name).replaceAll(".", "_")}.wav`;
                                                    let s_name_video_in = `${encodeURIComponent(o_file.o_js_file.name)}`;
                                                    o_ffmpeg.writeFile(
                                                        s_name_video_in,
                                                        new Uint8Array((await o_file.o_js_file.arrayBuffer()))
                                                    ).then(async ()=>{
                                                        let s_command = `-i ${s_name_video_in} ${s_name_audio_out}`;
                                                        f_execute_ffmpeg_command(
                                                            s_command.split(" ")
                                                        ).then(
                                                            ()=>{
                    
                    
                                                                o_ffmpeg.readFile(s_name_audio_out).then(async function(a_n_u8){
                                                                    o_file.o_audio_blob = new Blob([a_n_u8], {
                                                                        type: "audio/wav",
                                                                      });
                                                                    o_file.a_n_u8__audio_wav = a_n_u8
                        
                                                                    let od = document.createElement("div");
                                                                    od.id = 'ws' 
                                                                    document.body.appendChild(od);
                                                                    o_file.o_wavesurfer = o_wave_surfer.default.create({
                                                                        container: '#ws',
                                                                        waveColor: '#ffffff',
                                                                        progressColor: '#383351',
                                                                        // peaks: f_a_u_f32__from_wav_file(a_n_u8.buffer),
                                                                        // url: './ImperialMarch60.wav',
                                                                        // url: './concatted_1693091074101.mp4'
                                                                    })
                                                                    await o_file.o_wavesurfer.loadBlob(o_file.o_audio_blob);
                                                                    o_file.s_audio_waveform_image_dataurl = o_file.o_wavesurfer.renderer.canvasWrapper.querySelector("canvas").toDataURL()
                                                                    od.remove()
                                                                    // o_wave_surfer.default.empty();
                                                                    // o_wave_surfer.default.loadDecodedBuffer(a_n_u8.buffer);
                                                                });
                                                            }
                                                        );
                                                    });
                    
                                                    
                                                }
                                                console.log(o_file.s_src_object_url)
                                                o_el_video.src = o_file.s_src_object_url
                                                o_el_video.load();
                                            }
                                            o_reader.readAsDataURL(o_file.o_js_file);
                                        }
                                        o_state.o_file = o_state.a_o_file[0];
                                        o_o_js?.o_js__a_o_file?._f_render();
                                    }
                                }
                            }
                        }
                    )
                ]
            }
        ], 
    };

    var o_html = await f_o_html__and_make_renderable(o);
    document.body.className = 'theme_dark'
    document.body.appendChild(o_html)



    f_add_css('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
    class O_hsla{
        constructor(n_h, n_s, n_l, n_a){
            this.n_h = n_h
            this.n_s = n_s
            this.n_l = n_l
            this.n_a = n_a
        }
    }
    let s_theme_light = 'theme_light'
    let s_theme_dark = 'theme_dark'
    let a_s_theme = [
        s_theme_light,
        s_theme_dark
    ]
    let o_themes_props = {
        // foreground
        //      light
        [`o_hsla__fg${s_theme_light}`]:                 new O_hsla(.0, .0, .1, .93), 
        [`o_hsla__fg_hover${s_theme_light}`]:           new O_hsla(.0, .0, .1, .93), 
        [`o_hsla__fg_active${s_theme_light}`]:          new O_hsla(.0, .0, .1, .93), 
        [`o_hsla__fg_active_hover${s_theme_light}`]:    new O_hsla(.0, .0, .1, .93), 
        //      dark
        [`o_hsla__fg${s_theme_dark}`]:                 new O_hsla(.0, .0, .8, .93), 
        [`o_hsla__fg_hover${s_theme_dark}`]:           new O_hsla(.0, .0, .9, .93), 
        [`o_hsla__fg_active${s_theme_dark}`]:          new O_hsla(.0, .0, .9, .93), 
        [`o_hsla__fg_active_hover${s_theme_dark}`]:    new O_hsla(.0, .0, .9, .93), 
        
        [`o_hsla__bg${s_theme_light}`]:                 new O_hsla(.0, .0, .1, .93), 
        [`o_hsla__bg_hover${s_theme_light}`]:           new O_hsla(.0, .0, .1, .93), 
        [`o_hsla__bg_active${s_theme_light}`]:          new O_hsla(.0, .0, .1, .93), 
        [`o_hsla__bg_active_hover${s_theme_light}`]:    new O_hsla(.0, .0, .1, .93), 
        // 
        [`o_hsla__bg${s_theme_dark}`]:                 new O_hsla(.0, .0, .1, .93), 
        [`o_hsla__bg_hover${s_theme_dark}`]:           new O_hsla(.0, .0, .2, .93), 
        [`o_hsla__bg_active${s_theme_dark}`]:          new O_hsla(.0, .0, .2, .93), 
        [`o_hsla__bg_active_hover${s_theme_dark}`]:    new O_hsla(.0, .0, .2, .93), 

    };

    let f_s_hsla = function(o_hsla){
        return `hsla(${360*o_hsla?.n_h} ${o_hsla?.n_s*100}% ${o_hsla?.n_l*100}% / ${o_hsla?.n_a})`
    }


    // o_hsla__fg: O_vec4
    // o_hsla__fg_hover: O_vec4
    // o_hsla__fg_active: O_vec4
    // o_hsla__fg_active_hover: O_vec4
    // o_hsla__bg: O_vec4
    // o_hsla__bg_hover: O_vec4
    // o_hsla__bg_active: O_vec4
    // o_hsla__bg_active_hover: O_vec4
    // o_hsla_addition_vector_hover: O_vec4
    // o_hsla_addition_vector_active: O_vec4
    // n_rem_font_size_base: number
    // a_n_factor_heading_font_size: number[]
    // a_n_factor_heading_margin_botton: number[]
    // o_hsla_primary: O_vec4
    // o_hsla_secondary: O_vec4
    // n_rem_padding_interactive_elements: number
    // n_rem_border_size_interactive_elements: number
    // n_px_border_clickable_with_border: number
    // n_px_border_radius: number
    // s_border_style: string
    // n_nor_line_height_p: number
    // n_rem_margin_bottom_interactive_elements: number
    o_variables_css.n_rem_padding_interactive_elements = 1;
    let s_css_theme = f_s_css_from_o_variables(
        o_variables_css
    );
    let s_css = `
            ${s_css_theme}
            .border_shadow_popup{
                box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
            }
            .theme_dark .border_shadow_popup{
                box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
            }
            .w_1_t_7{
                align-items: center;
                display: flex;
                justify-content: center;
                flex: 1 1 calc(100%/7);
            }
        
            .w_1_t_3{
                align-items: center;
                display: flex;
                justify-content: center;
                flex:1 1 calc(100%/3);
            }
            .h_100vh{
                height: 100vh;
                flex-direction: column;
            }
            div{
                box-sizing:border-box;
            },
            .disable_select {
                user-drag: none;
                user-select: none;
                -moz-user-select: none;
                -webkit-user-drag: none;
                -webkit-user-select: none;
                -ms-user-select: none;
            }

            .o_scrollbar.disable_select > * {
                user-drag: none;
                user-select: none;
                -moz-user-select: none;
                -webkit-user-drag: none;
                -webkit-user-select: none;
                -ms-user-select: none;
            }
            
            img {
                user-drag: none;
                user-select: none;
                -moz-user-select: none;
                -webkit-user-drag: none;
                -webkit-user-select: none;
                -ms-user-select: none;
            }
            .video{
                position:relative;
            }
            .o_video_o_js_video_name {
                position: absolute;
                z-index: 1;
                width: 100%;
                display: flex;
                padding: 2rem;
                background: rgba(0,0,0,0.2);
            }
            
            .video,video{
                display:flex;
                width: auto;
                height: auto;
                flex: 1 1 0;
                min-width: 0;
                min-height: 0;
            }
            .o_w_100{
                width:100%;
                height: 2rem;
                position:relative;
            }
            .o_playhead {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
                background: red;
                border: 1px solid lime;
                width: 2px;
                height: 100%;
                z-index: 1;
                position: absolute;
                left: 50%;
            }
            .waveform{
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                width:100%;
                height: 100%;
                z-index:-1;
            }
            .o_scrollbar {
                position: relative;
                overflow-x: scroll;
                overflow-y: hidden;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
            .a_o_file{
                display:flex;
                flex-direction:row;
                box-sizing:border-box;
            }
            .length{
                height: 2rem;
            }
            .o_file.length{
                //background: #8aa2c466;
                border: 1px solid;
                border-radius: 3px;
            }
            *::-webkit-scrollbar {
                display: none;
              }
            .n_ms_cut {
                position: absolute;
                width: 1px;
                height: 100%;
                background: red;
                z-index: 2;
            }
            .n_ms_cut__closest_to_playhead{
                background: green;
                width: 2px;
            }
            .o_video_cut{
                position: absolute;
                height: 100%;
                background: rgba(0,255,0,0.5);
                z-index: 1;
            }
            .o_video_cut.before{
                background: rgba(198,255,0,0.5);
            }
            .o_video_cut.current{
                background: rgba(198,255,198,0.5);
            }
            .o_video_cut.after{
                background: rgba(0,255,198,0.5);
            }
            .bar_pole_pattern {
                background-image: 
                repeating-linear-gradient(
                  -45deg, 
                  transparent, 
                  transparent 1rem,
                  #8aa2c466 1rem,
                  #8aa2c466 2rem
                );
              }
              .buttons{
                display: flex;
                flex-wrap: wrap;
                flex-direction: row;
                width: 100%;
              }

              /* Container for the slider */
                .slider_big_horizontal-container {
                width: 100%; /* Full width of the container */
                padding: 10px; /* Some padding around the slider */
                }

                /* Styling for the slider */
                .slider_big_horizontal {
                -webkit-appearance: none; /* Override default appearance */
                appearance: none;
                width: 100%; /* Full width of the container */
                height: 30px; /* Make it big for easy drag */
                background: #ddd; /* Background of the slider */
                outline: none; /* Remove the outline */
                opacity: 0.7; /* Slightly transparent */
                transition: opacity 0.2s; /* Smooth transition for hover effect */
                }

                /* Hover effect for the slider */
                .slider_big_horizontal:hover {
                opacity: 1; /* Fully opaque on hover */
                }

                /* Styling for the slider thumb (the draggable part) */
                .slider_big_horizontal::-webkit-slider-thumb {
                -webkit-appearance: none; /* Override default appearance */
                appearance: none;
                width: 50px; /* Width of the thumb */
                height: 50px; /* Height of the thumb, making it big */
                background: #4CAF50; /* Background color of the thumb */
                cursor: pointer; /* Cursor changes to pointer when hovering over the thumb */
                }

                .slider_big_horizontal::-moz-range-thumb {
                width: 50px; /* Width of the thumb for Mozilla */
                height: 50px; /* Height of the thumb for Mozilla */
                background: #4CAF50; /* Background color of the thumb for Mozilla */
                cursor: pointer; /* Cursor pointer for Mozilla */
                }

    `;
    // let s_css_prefixed = f_s_css_prefixed(
    //     s_css,
    //     `.${s_version_class}`
    // );
    f_add_css(s_css)



export {
    f_s_version_suffix
}