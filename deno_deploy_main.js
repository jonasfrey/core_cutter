import { serve } from "https://deno.land/std@0.152.0/http/server.ts";
import {O_folder_file} from "https://deno.land/x/o_folder_file@0.3/O_folder_file.module.js"

async function handleRequest(o_request) {

  const o_url = new URL(o_request.url);

  let o_folder_file = new O_folder_file(o_url.pathname);
  let s_file_content;
  try {
      s_file_content = await Deno.readFile(`localhost${o_url.pathname}`)
  } catch (error) {
    return new Response('not found')
  }
  let s_mime_type = 'text/plain'
  if(o_folder_file.o_mime_type_guessed_by_file_extension?.s_mime_type){
    s_mime_type = o_folder_file.o_mime_type_guessed_by_file_extension.s_mime_type
    }else{
        s_mime_type = "text/plain"
    }
    return new Response(
        s_file_content,
        {
            headers: {
                "content-type": s_mime_type,
            },
        }
    );

//   if (pathname.endsWith(".css")) {
//     const file = await Deno.readFile(pathname.substring(1));
//     return new Response(file, {
//       headers: {
//         "content-type": "text/css",
//       },
//     });
//   }

//   if (pathname.endsWith(".png")) {
//     const file = await Deno.readFile(pathname.substring(1));
//     return new Response(file, {
//       headers: {
//         "content-type": "image/png",
//       },
//     });
//   }

//   if (pathname.endsWith(".mpeg")) {
//     const file = await Deno.readFile(pathname.substring(1));
//     return new Response(file, {
//       headers: {
//         "content-type": "video/mpeg",
//       },
//     });
//   }

//   if (pathname.startsWith("/bundled.js")) {
//     const { code } = await bundle(new URL("./src/entry.ts", import.meta.url), {
//       cacheRoot: "./cache",
//     });

//     return new Response(code, {
//       headers: {
//         "content-type": "text/javascript",
//       },
//     });
//   }

//   return new Response(await Deno.readFile("index.html"), {
//     headers: {
//       "content-type": "text/html; charset=utf-8",
//     },
//   });
}

serve(handleRequest);