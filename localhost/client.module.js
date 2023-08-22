import {f_o_html_from_o_js} from "https://deno.land/x/f_o_html_from_o_js@0.7/mod.js";
import {
    f_add_css,
    f_s_css_prefixed
} from "https://deno.land/x/f_add_css@0.6/mod.js"

let f_download_text_file = function(
    s_name_file, 
    s_content
){

    // Create a Blob object
    const blob = new Blob([s_content], { type: 'plain/text' });
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

// f_download_text_file("lol.txt", 'this is lol')


window.o_state = {
    n_o_file_n_id: 0, 
    a_o_file: [],
    o_file: null,
    n_ms_per_px: 10,
    n_ms_playhead: 0,
    b_mouse_down_o_scrollbar: false,
    o_trn_mouse_down: {n_x:0, n_y:0},
    o_trn_mouse_up: {n_x:0, n_y:0},
    o_trn_mouse_move: {n_x:0, n_y:0},
    a_o_video_cut: [], 
    a_n_ms_cut: [], 
    n_ms_cut__closest_to_playhead: 0, 
    b_prevent_on_seeking_call_because_current_time_change : false,
    b_prevent_on_scroll_event : false,
    n_id_recursive_function_call: 0, 
};

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

let o_js__a_o_file, 
    o_js__video,
    o_js__o_scrollbar; 

let f_update_o_state_n_ms_playhead = function(n_ms, b_update_video_current_time = true){
    if(n_ms < 1 || !isFinite(n_ms)){return}
    let o_playhead_file = f_o_playhead_file(n_ms);
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
    if(n_ms_cut__closest_to_playhead_last != o_state.n_ms_cut__closest_to_playhead){
        o_js__a_o_file?._f_render()
    }


    if(o_playhead_file.o_file != o_state.o_file){
        o_state.o_file = o_playhead_file.o_file;
        o_js__video?._f_render();
    }
    if(b_update_video_current_time){
        document.querySelector("video").currentTime = o_playhead_file.n_ms_playhead_relative / 1000;
    }else{
        let o_el_scrollbar = document.querySelector(".o_scrollbar");
        let n_ms_length_total = f_n_ms_length_total()
        let n_ms_nor = n_ms / n_ms_length_total;
        let n_x_px_scroll_max = o_el_scrollbar?.scrollWidth-o_el_scrollbar?.clientWidth;
        let n_x_px =  n_x_px_scroll_max * n_ms_nor; 
        o_state.b_prevent_on_scroll_event = true
        o_el_scrollbar?.scrollTo(n_x_px,0);
        window.setTimeout(function(){
            o_state.b_prevent_on_scroll_event = false
        },100)
    }

}



let f_recursive_f_set_n_ms_per_px = function(){
    
    o_state.n_id_recursive_function_call = window.requestAnimationFrame(f_recursive_f_set_n_ms_per_px)

    let n_ms_length_total = 0;
    for(let o_file of o_state?.a_o_file){
        if(o_file == o_state?.o_file){
            break;
        }
        n_ms_length_total += o_file.n_ms_length;
    }
    
    f_update_o_state_n_ms_playhead(
        n_ms_length_total+document.querySelector('.o_video_preview').currentTime*1000,
        false
    );
    
}


    o_js__video = {
        f_o_js: function(){
            return {
                class: "o_video_preview",
                s_tag: "video", 
                id: "o_file_video",
                src: o_state?.o_file?.s_src_object_url,
                controls: "true",
                onplaying: function(){
                    o_state.n_id_recursive_function_call = window.requestAnimationFrame(f_recursive_f_set_n_ms_per_px)
                },
                onpause: function(){
                    window.cancelAnimationFrame(o_state.n_id_recursive_function_call)
                },
                onseeking: function(){
                    if(o_state?.b_prevent_on_seeking_call_because_current_time_change){
                        return false;
                    }
                    // console.log("onseeking called (will be also called when currentTime changes)")
                    let n_ms_length_total = 0;
                    for(let o_file of o_state?.a_o_file){
                        if(o_file == o_state?.o_file){
                            break;
                        }
                        n_ms_length_total += o_file.n_ms_length;
                    }
                    
                    f_update_o_state_n_ms_playhead(n_ms_length_total+this.currentTime*1000, false);
                    
                    // o_js__o_scrollbar?._f_render();
                    // console.log(this.currentTime)
                }
            }
        }
    };  
    let o_js__filepicker = {
        f_o_js: function(){
            return {
                s_tag: "button", 
                class: "clickable",
                innerText: "add file(s) +", 
                onclick: async function(){

                    let a_o_file_handle = await window.showOpenFilePicker(
                        {
                            types: [
                              {
                                description: "videos    ",
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
                            
                            o_js__video._f_render();
                            // let o_el_video = document.querySelector("#o_file_video");
                            let o_el_video = document.createElement("video");
                            // document.body.appendChild(o_el_video)
                            // o_el_video.controls = true;
                            o_el_video.onloadeddata = function(){
                                o_file.n_ms_length = o_el_video.duration * 1000;   
                            }
                            console.log(o_file.s_src_object_url)
                            o_el_video.src = o_file.s_src_object_url
                            o_el_video.load();
                        }
                        o_reader.readAsDataURL(o_file.o_js_file);
                    }
                    o_state.o_file = o_state.a_o_file[0];
                    o_js__a_o_file?._f_render();
                }
            }
        }
    }

    o_js__a_o_file = {
        f_o_js: function(){
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
                                class: "o_file length bar_pole_pattern"
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
                                class: `o_video_cut`
                            }
                        }
                    ),
                    o_js_spacer 
                ]
                
            }
        }
    }
    let f_n_ms_length_total = function(){
        return o_state.a_o_file.reduce(
            (n_acc, o_file)=>{return n_acc + o_file.n_ms_length},
            0
        )
    }
    window.onmousedown = function(){
        o_state.o_trn_mouse_down.n_x = window.event.clientX;
        o_state.o_trn_mouse_down.n_y = window.event.clientY;
    }
    window.onmouseup = function(){
        o_state.b_prevent_on_seeking_call_because_current_time_change = false
        o_state.o_trn_mouse_up.n_x = window.event.clientX;
        o_state.o_trn_mouse_up.n_y = window.event.clientY;
    }
    class O_playhead_file{
        constructor(
            n_ms_playhead_absolute,
            n_ms_playhead_relative,
            o_file
        ){
            this.n_ms_playhead_absolute = n_ms_playhead_absolute,
            this.n_ms_playhead_relative = n_ms_playhead_relative,
            this.o_file = o_file
        }
    }
    let f_o_playhead_file = function(
        n_ms_playhead_absolute
    ){
        let n_ms_playhead_relative = n_ms_playhead_absolute;

        let n_ms_length_total = 0;
        let o_file = o_state.a_o_file.find(
            (o_file)=>{
                let n_ms_length_total_new = n_ms_length_total + o_file.n_ms_length;
                if(
                    n_ms_playhead_absolute >= n_ms_length_total 
                     && n_ms_playhead_absolute <= n_ms_length_total_new
                ){
                    return true
                    return o_file
                }
                n_ms_playhead_relative = n_ms_playhead_relative - o_file.n_ms_length; 
                n_ms_length_total = n_ms_length_total_new;
            }
        )
        // console.log('playhead o_file.o_js_file')
        // console.log(o_file.o_js_file)
        return new O_playhead_file(
            n_ms_playhead_absolute, 
            n_ms_playhead_relative, 
            o_file
        )
    }

    let f_update_a_o_video_cut = function(){
        o_state.a_n_ms_cut = o_state.a_n_ms_cut.sort((n1,n2)=>n1-n2);

        o_state.a_o_video_cut = o_state.a_n_ms_cut.map(
            (n_ms_cut, n_idx) => {
                if(n_idx % 2 == 1){
                    let n_ms_cut__last = o_state.a_n_ms_cut[n_idx-1];
                    let o_playhead_file_last = f_o_playhead_file(n_ms_cut__last);
                    let o_playhead_file = f_o_playhead_file(n_ms_cut);
                    console.log(o_playhead_file.o_file.o_js_file)
                    if(o_playhead_file_last.o_file != o_playhead_file.o_file){
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
    let f_remove_cut = function(n_ms_cut){
        
        o_state.a_n_ms_cut = o_state.a_n_ms_cut.sort((n1,n2)=>n1-n2)
        let n_idx = o_state.a_n_ms_cut.indexOf(n_ms_cut);
        if(n_idx!= -1){
            o_state.a_n_ms_cut.splice(n_idx, 1);
        }
        o_state.a_n_ms_cut = o_state.a_n_ms_cut.sort((n1,n2)=>n1-n2);
        f_update_a_o_video_cut();
        o_js__a_o_file?._f_render();
    }
    let f_cut = function(){
        o_state.a_n_ms_cut.push(
            o_state.n_ms_playhead
        );
        o_state.a_n_ms_cut = o_state.a_n_ms_cut.sort((n1,n2)=>n1-n2)
        f_update_a_o_video_cut();
        o_js__a_o_file?._f_render();
        console.log(o_state.a_o_video_cut.map(o=>o.o_file.o_js_file.name));
    }
    window.onkeydown = function(){
        if(window.event.keyCode == 's'.toUpperCase().charCodeAt(0)){
            f_cut()
        }
        if(window.event.keyCode == 'a'.toUpperCase().charCodeAt(0)){
            f_remove_cut(o_state.n_ms_cut__closest_to_playhead)
        }
        let n_ms_one_frame_assumed = 1000/30;//30 fps
        if(window.event.keyCode == 'q'.toUpperCase().charCodeAt(0)){
            f_update_o_state_n_ms_playhead(Math.max(o_state.n_ms_playhead - n_ms_one_frame_assumed, 0));
        }
        if(window.event.keyCode == 'e'.toUpperCase().charCodeAt(0)){
            f_update_o_state_n_ms_playhead(Math.min(o_state.n_ms_playhead + n_ms_one_frame_assumed, f_n_ms_length_total()));
        }
        if(window.event.keyCode == 'd'.toUpperCase().charCodeAt(0)){
            f_update_o_state_n_ms_playhead(Math.max(o_state.n_ms_playhead - n_ms_one_frame_assumed*3, 0));
        }
        if(window.event.keyCode == 'f'.toUpperCase().charCodeAt(0)){
            f_update_o_state_n_ms_playhead(Math.min(o_state.n_ms_playhead + n_ms_one_frame_assumed*3, f_n_ms_length_total()));
        }
        if(window.event.keyCode == ' '.toUpperCase().charCodeAt(0)){
            let o_el_video = document.querySelector("#o_file_video");
            if(o_el_video.paused){
                o_el_video.play()
            }else{
                o_el_video.pause()
            }
        }
    }
    
    o_js__o_scrollbar = {
        f_o_js: function(){
            return {
                class: "o_scrollbar disable-select", 
                a_o: [ 
                    o_js__a_o_file
                ],
                onmousedown: function(){
                    o_state.b_prevent_on_seeking_call_because_current_time_change = true
                    
                    o_state.b_mouse_down_o_scrollbar = true
                    o_state.o_trn_mouse_move = {
                        n_x: window.event.clientX,
                        n_y: window.event.clientY
                    };
                },
                onmouseup: function(){
                    o_state.b_mouse_down_o_scrollbar = false
                },                      
                onmousemove: function(){

                    let n_x = o_state.o_trn_mouse_move.n_x - window.event.clientX;
                    let n_ms = n_x * o_state.n_ms_per_px;
                    if(!o_state.b_mouse_down_o_scrollbar){
                        o_state.o_trn_mouse_move = false;
                    }
                    if(o_state.b_mouse_down_o_scrollbar && o_state.o_trn_mouse_move){
                        
                        o_state.o_trn_mouse_move = {
                            n_x: window.event.clientX,
                            n_y: window.event.clientY
                        };
                        document.querySelector(".o_scrollbar").scrollLeft = document.querySelector(".o_scrollbar").scrollLeft + n_x;
                    }
                },
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
    let f_set_n_ms_per_px = function(n_ms_per_px){
        o_state.n_ms_per_px = n_ms_per_px;
        o_js__a_o_file?._f_render();
        f_update_o_state_n_ms_playhead(o_state.n_ms_playhead);
    }
    
    window.o_js__o_scrollbar = o_js__o_scrollbar
    let o = {
        class: "position_relative d_flex h_100vh",
        a_o:[
            {
                class: "video", 
                a_o:[
                    o_js__video,
                ]
            },
            {
                class: "o_w_100", 

                a_o: [
                    {
                        class: "o_playhead", 
                    }, 
                    o_js__o_scrollbar, 
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
                        innerText: "cut ('s')", 
                        onclick: async function(){
                            f_cut();
                            
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
                        innerText: "get render .sh", 
                        onclick: async function(){
                            let f_s_hms__from_n_ms = function(n_ms){
                                let n_hours = (((n_ms / 1000) / 60) / 60)
                                let n_minutes = (n_hours - parseInt(n_hours)) * 60;
                                let n_seconds = ((n_ms / 1000) % 60)
                                
                                return `${(''+parseInt(n_hours)).padStart(2, '0')}:${(''+parseInt(n_minutes)).padStart(2, '0')}:${(''+(n_seconds.toFixed(3))).padStart(6, '0')}`
                                // format 02.250
                            }
                            let n_ts = new Date().getTime()
                            let f_s_name_file = function(o_video_cut){
                                let n_idx = o_state.a_o_video_cut.indexOf(o_video_cut);
                                let s_name = `${o_video_cut.o_file.o_js_file.name}_${o_video_cut.n_id_video}_${n_idx}`.replace(/[^a-z0-9_]/gi, '');
                                let s_name_file = `${s_name}.mp4`;
                                return s_name_file
                            }
                            let s_name_list = `list_${n_ts}.txt`
                            f_download_text_file(
                                s_name_list,
                                `
                                ${o_state.a_o_video_cut.map(
                                    (o_video_cut)=>{
                                        return `file '${f_s_name_file(o_video_cut)}'`
                                    }
                                ).join("\n")}
                                `
                            )
                            let s_name_file_render = `render_${n_ts}.sh` 
                            f_download_text_file(
                                s_name_file_render, 
                                `
                                ${o_state.a_o_video_cut.map(
                                    (o_video_cut, n_idx_o_video_cut)=>{
                                        let s_file_name = `${o_video_cut.n_id_video}_${n_idx_o_video_cut}.mp4`;
                                        // return    `ffmpeg -i ${o_video_cut.o_file.o_js_file.name} -ss ${f_s_hms__from_n_ms(o_video_cut.n_ms_start)} -t ${f_s_hms__from_n_ms(o_video_cut.n_ms_length)} -c:v copy -c:a copy ${o_video_cut.n_id_video}_${n_idx_o_video_cut}.mp4`
                                        // return `mencoder -ss ${f_s_hms__from_n_ms(o_video_cut.n_ms_start)} -endpos ${f_s_hms__from_n_ms(o_video_cut.n_ms_length)} -oac pcm -ovc copy ${o_video_cut.o_file.o_js_file.name} -o ${s_file_name}`
                                        return    `ffmpeg -ss ${f_s_hms__from_n_ms(o_video_cut.n_ms_start)} -t ${f_s_hms__from_n_ms(o_video_cut.n_ms_length)} -i '${o_video_cut.o_file.o_js_file.name}' -c copy ${f_s_name_file(o_video_cut)}`
                                                    
                                    }
                                ).join("\n")}
                                ${(()=>{
                                    return `ffmpeg -f concat -i ${s_name_list} -c copy concatted_${n_ts}.mp4`
                                })()}
                                ${o_state.a_o_video_cut.map(
                                    (o_video_cut, n_idx_o_video_cut)=>{
                                        let s_file_name = `${o_video_cut.n_id_video}_${n_idx_o_video_cut}.mp4`;
                                        // return    `ffmpeg -i ${o_video_cut.o_file.o_js_file.name} -ss ${f_s_hms__from_n_ms(o_video_cut.n_ms_start)} -t ${f_s_hms__from_n_ms(o_video_cut.n_ms_length)} -c:v copy -c:a copy ${o_video_cut.n_id_video}_${n_idx_o_video_cut}.mp4`
                                        // return `mencoder -ss ${f_s_hms__from_n_ms(o_video_cut.n_ms_start)} -endpos ${f_s_hms__from_n_ms(o_video_cut.n_ms_length)} -oac pcm -ovc copy ${o_video_cut.o_file.o_js_file.name} -o ${s_file_name}`
                                        return    `rm ${f_s_name_file(o_video_cut)}`
                                                    
                                    }
                                ).join("\n")}
                                rm ${s_name_list}
                                rm ${s_name_file_render}

                                `
                            )
                            
                        }
                    },
                    {
                        s_tag: "button", 
                        class: "clickable",
                        innerText: "merge mp4 files .sh", 
                        onclick: async function(){
                            let n_ts = new Date().getTime()

                            let s_name_list = `list_${n_ts}.txt`
                            f_download_text_file(
                                s_name_list,
                                `
                                ${o_state.a_o_file.map(
                                    (o_file)=>{
                                        return `file '${o_file.o_js_file.name}'`
                                    }
                                ).join("\n")}
                                `
                            )
                            let s_file_name__default = `mp4_files_merged_${n_ts}.mp4`
                            let s_file_name = prompt("file name:", s_file_name__default);
                            let s_name_file_render = `merge_mp4_files_${n_ts}.sh` 
                            f_download_text_file(
                                s_name_file_render, 
                                `
                                ${(()=>{
                                    return `ffmpeg -f concat -i ${s_name_list} -c copy ${s_file_name}`
                                })()}
                                rm ${s_name_list}
                                rm ${s_name_file_render}

                                `
                            )
                        }
                    },
                    o_js__filepicker
                ]
            }
        ], 
    };

    var o_html = f_o_html_from_o_js(o);
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
    
    let s_core_css = `
    ${a_s_theme.map(s_theme =>{
        let o_theme_props = Object.assign(
            {}, 
            ...Object.keys(o_themes_props).filter(s=>s.includes(s_theme)).map(
                s_prop => {
                    let s_prop_without_s_theme = s_prop.replace(s_theme, '');

                    return {
                        [s_prop_without_s_theme]: o_themes_props[s_prop], 
                    }
                }
            )
        )
        return `
            .${s_theme} *{
                background: ${f_s_hsla(o_theme_props.o_hsla__bg)};
                color: ${f_s_hsla(o_theme_props.o_hsla__fg)};
            }
            .${s_theme} .clickable{
                padding:1rem;
                border-radius:3px;
            }
            .${s_theme} .clickable:hover{
                background: ${f_s_hsla(o_theme_props.o_hsla__bg_hover)};
                color: ${f_s_hsla(o_theme_props.o_hsla__fg_hover)};
                cursor:pointer;
            }
            .${s_theme} .clickable.clicked{
                background: ${f_s_hsla(o_theme_props.o_hsla__bg_active)};
                color: ${f_s_hsla(o_theme_props.o_hsla__fg_active)};
                cursor:pointer;
            }
            .${s_theme} .clickable.clicked:hover{
                background: ${f_s_hsla(o_theme_props.o_hsla__bg_active_hover)};
                color: ${f_s_hsla(o_theme_props.o_hsla__fg_active_hover)};
                cursor:pointer;
            }
        `
    }).join("\n")}
    .position_relative{
        position:relative
    }
    .o_js_s_name_month_n_year{
        position:absolute;
        top:100%;
        left:0;
        width:100%;
    }
    input, button{
        border:none;
        outline:none;
        flex: 1 1 auto;
    }
    .input{
        display:flex;
    }

    .d_flex{
        display: flex;
        flex-wrap: wrap;
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
    *{
        font-size: 1.2rem;
        color: rgb(25 25 25 / 50%);
        background:white;
        padding: 0;
        margin:0;
    }
    .border_shadow_popup{
        box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
    }
    .theme_dark .border_shadow_popup{
        box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
    }
    *{
        font-family:helvetica;
    }
    ${(new Array(20).fill(0)).map(
        function(n, n_idx){
            let num = (n_idx /10)
            let s_n = num.toString().split('.').join('_');
            return `
                .p-${s_n}_rem{padding: ${num}rem}
                .pl-${s_n}_rem{padding-left: ${num}rem}
                .pr-${s_n}_rem{padding-right: ${num}rem}
                .pt-${s_n}_rem{padding-top: ${num}rem}
                .pb-${s_n}_rem{padding-bottom: ${num}rem}
            `
        }
    ).join("\n")} `;
    console.log(s_core_css)
    let s_css = `
            ${s_core_css}
            .h_100vh{
                height: 100vh;
                flex-direction: column;
            }
            div{
                box-sizing:border-box;
            },
            .disable-select {
                -webkit-user-select: none;  
                -moz-user-select: none;    
                -ms-user-select: none;      
                user-select: none;
            }
            .video {
                flex: 1 1 auto;
                display:flex;
                flex-direction:row;
                align-items:center;
                justify-content: center;

            }
            video{
                height:100%;
            }
            .o_w_100{
                width:100%;
                height: 2rem;
                position:relative;
            }
            .o_playhead {
                width: 1px;
                height: 100%;
                background: black;
                z-index: 1;
                position: absolute;
                left: 50%;
            }
            .o_scrollbar {
                position: relative;
                overflow-x: scroll;
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
    `;
    // let s_css_prefixed = f_s_css_prefixed(
    //     s_css,
    //     `.${s_version_class}`
    // );
    f_add_css(s_css)



export {
    f_s_version_suffix
}