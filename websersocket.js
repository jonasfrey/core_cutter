import {
    f_websersocket_serve, 
    f_v_before_return_response__fileserver
} from "https://deno.land/x/websersocket@0.1/mod.js"

let s_path_file_current = new URL(import.meta.url).pathname;
let s_path_folder_current = s_path_file_current.split('/').slice(0, -1).join('/'); 
// console.log(s_path_folder_current)

let f_handler = async function(o_request){
    return f_v_before_return_response__fileserver(
        o_request,
        `${s_path_folder_current}/localhost/`
    )
}

await f_websersocket_serve(
    [
        {
            n_port: 8081, 
            b_https: false, 
            s_hostname: 'localhost',
            f_v_before_return_response: f_handler 
        }, 
        {
            n_port: 8444, 
            b_https: true, 
            s_hostname: 'localhost',
            f_v_before_return_response: f_handler
        }
    ]
)