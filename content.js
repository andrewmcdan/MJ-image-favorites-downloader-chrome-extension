const backgroundMessage = async (property,msg) => {
    let messageRes = null;
    const handleRes = (e) => {
        // console.log({e});
        if(e.hasOwnProperty(property)){
            console.log(property, e);
            messageRes = e[property];
            port.onMessage.removeListener(handleRes);
        }
    }
    port.onMessage.addListener(handleRes);
    port.postMessage(msg);

    while (messageRes === null) {
        await waitSeconds(1);
    }
    return messageRes;
}

const getThisUserJobsData = async () => {
    return await backgroundMessage('thisUserJobsData',{ msg: 'getThisUserJobsData'});
}


class mainScript{
    constructor(id){
        this.windowListenerID = id;
    }

    sendMessage(msg){
        window.dispatchEvent(new CustomEvent(this.windowListenerID+'c', {detail: msg})); // send a response back to the main script
    }

    setupListener(cb){
        window.addEventListener(this.windowListenerID+'m', function (e) {
            this.doListener = cb;
            this.doListener(e);
        });
    }
}

console.log('Connecting to background script');
// Establish a connection to the background script
var port = chrome.runtime.connect({ name: "content-script" });

if(!port){
    console.log('Unable to connect to background script');
}else{
    console.log('Connected to background script');
}

const waitSeconds = (s) => new Promise(resolve => setTimeout(resolve, 1000 * s));

let mainScripts = [];

window.addEventListener('main-script-initiator', function (e) {
    // this event gets fired whenever the page loads and the main script is ready to send and receive events
    console.log('main script sent initiator', e.detail);
    mainScripts.push(new mainScript(e.detail));
    let currentScript = mainScripts[mainScripts.length - 1];
    currentScript.sendMessage('ok');
    currentScript.setupListener(async function(event){
        if(event.detail == 'getThisUserJobsData'){
            console.log('getting this user jobs data');
            let thisUserJobsData = await getThisUserJobsData();
            currentScript.sendMessage({thisUserJobsData: thisUserJobsData});
        }
    });
    // now we have a unique channel to communicate with the main script
});



// loop();



// fetch("https://www.midjourney.com/api/pg/thomas-jobs?user_id=f66ba656-fc1b-4366-8ec8-cf52cbc47309&page_size=10000&cursor=gAAAAABlQXewyjFBDTva9mdtLg2Ix0IbPuZu2_1e_cMFWKrFD49f1dO_YSU95hGhT6okf2eVdPhAkji96uvOeT8a8KAn-lRksdIEUoTTl8-3K0NqZ7lPKmS3cWYoHXhl48mxnngsq0EXxWV0BHAuvjMvZgAHHSGH9Ewfm7b3sgO3J4PLBVJrllSH8eE03p7gDKBqH6ZWFpKBU0alV1Ofgc0Wd877Qbmp5E5YjERawpon3YXnCbqro28=", {
//   "headers": {
//     "accept": "*/*",
//     "accept-language": "en-US,en;q=0.9",
//     "cache-control": "no-cache",
//     "content-type": "application/json",
//     "pragma": "no-cache",
//     "sec-ch-ua": "\"Chromium\";v=\"118\", \"Google Chrome\";v=\"118\", \"Not=A?Brand\";v=\"99\"",
//     "sec-ch-ua-mobile": "?0",
//     "sec-ch-ua-platform": "\"Windows\"",
//     "sec-fetch-dest": "empty",
//     "sec-fetch-mode": "cors",
//     "sec-fetch-site": "same-origin",
//     "x-csrf-protection": "1",
//     "cookie": "__Host-next-auth.csrf-token=8708880189128c65a35f9944423d2e3ac9301c55c8b191b4939b56fbdd80ce9e%7C95db751a4649b0620135d603c40764354d11b4cf41a80261609f05be4ab4a50b; imageSize=medium; imageLayout_2=hover; getImageAspect=2; fullWidth=false; showHoverIcons=true; _ga=GA1.1.167389610.1696560556; __stripe_mid=929458a4-208c-4767-9e7c-5268362f129fa1e2ec; intercom-id-gp8wgfwe=c08504b0-3745-497f-b33b-abc4fd1bf5cc; intercom-device-id-gp8wgfwe=ae7b76b3-959c-476e-86d9-f1f07410bd8f; __Secure-next-auth.callback-url=https%3A%2F%2Fwww.midjourney.com%2Fapp%2F; AMP_MKTG_74801b10c7=JTdCJTdE; __Secure-next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..PUJQUFlwtHAB9cCa.Hw6hAmOj-0jQqr6DymdN7JV17jwoi-1HzFEPSBQAtdtB3pFXAVDAUd6Jfap1Z2hCCQ4GbcxF7ubue3bEa7SeF7ldhRgCezkpEdtXDYDT-DuHGfFFeioNtJTHCihesKiZLEgulHEhrpYWzpaFxTp6hWErzAKco8cD9kkbs0AL5zHohyd9Z4Sjr-cXFvcCXDxmGq4FzLSNm2n7a_q7RPq9W7LMJUwBM5pV23SocxiGLxranapDIl7XqQaLCDlUpco83zWASQGkSTxRXyZxuGGu7BJrOkQuUub_oVbMxS76sSfP__ImwHtnlBDmGqM-8qJECSpj2uM35-U5I-SBjuw_wqBgcXT1_Mqy0rYsIZb25qUQ0vqhY9c86C9ye9rOROcZTOd5tLKgLrC0EGOD_1dicBjYbYZr7vuBYoX8BEPhgF768lhSWUfvwEiqd0dLMJUJKHHUs39_6GMDce_R1Z2VE_Nzn5ym8WwhLUVErhWEuDc880pZoJSvepsePVDYbNJZmWBzs2kYIM1ElEJXf3f9O8IGmgTcc1a3TGFzQB0PoLy2QXMhApBgcDK_5DiQXTrlnnPjwfvHxEdtpU87iuj-GcWi2qMuzD8Q1fzXgdKS1dJbFYQ8uo4Y1pL0Zy3p-ZhuZsCdbY-2J09JYkVofaqpP6Q36ufop3Fe6W7B1kAq9cySLIEOyefiw0g1ZfVhOCWvLWYmgzcZm5Kw23ferTPobh9h_HEl--0QuLaxQqtR7B4kEsKCTlEMyYw-5sygRystY3QX7BlDcD0dqtDMXx-CY_RgxAgfsQnmNDY7yd5OZH_d4mpWDVs2I1tb_lEy9vlK8U8NCM7moIV-8uuJANJM_x4dEtxzH-RjXrbaZvYBu6KkWhZWI_zfY2G-d-_o5guZLIWAVuJ1Ef8cGqvUM8z7DG9z-X5U81CUCttpuXMm5V5wY6bV2l4J7zfWXVhqdiT_IAK1_t6ZuEBuJtT7cPPzNecpovoHxfOVizO73DP_FLviu7Mgd9RtjxqGzxPLrQggL_5VsrSm6rtYuN6BchJEyktWGAe12eu9EuxS1U7qn52mhNpAvRfE61XZsj0cD_g_w9S_InMNkGtDz2Gug2JnjkSiGAfLNpKEeo_yxruqbbxHXc3mO6-SioWVbSioZkCzO-d5R9ehvwF_mg14FQW33ZvlCwTu7qisMkbybedGi3USSPAGBvuCVurwoJQQTavKXP60HtoNHG-AoifVDDwdlcrZfQjL_6VoZQ_74OjF2rkC4H5z3j09SlUj9rwLxvTLKwlKE66HeIdgO32EXQrJAPhQolnyH6aoxVotZEcZjMAGaOrs-to_lQc_1jbR0ftzi2r3LuNyy3IkrPMTLPOAV6sCAJOU9Stn5zhg2oSvhM7z-wocpcFtuR173zTrMXnFSGl_UfrKRTD4pug3PTsrmZTx0J3erSQJ9C0bnIp7FrdFZ1j4nlt_5ALgBlkpFKr9g8Rhpem_OzNekfthMWD_qpZMCHgHgFvOhZ2Ubanf-lK8syhv0oYhxwzmb0Xn_sBS_hjUkAuP4U1LxFJ2LsI_kEnR1vzq-8XLX-XUfVPrMMFOrR_a6yTq9dVzNFbiOgTAmSrvzOW24VRAVIz9c_Vxaw_8S5Tz2f95bKE1K45Cw3v57kWf1ftLhWs_H7MSApIXuBa12PAIsbmZUQ9mnKsrIh3t5rBtqPzgqtusR_R4WsT91z6LSxC3OzklWf6D8jARIs3Ltpg3IF2IvRSqv8IyMqxRIMdJHiqNryMm8DZIihSgzoStSSzcDBa5KwG1eaQE-hhBzFVeyT7yZ9KuNqUIgqc_xXGIsn-CZRH37Yqw0ZGZyRc3rqwjOygoBpDBl-GNCE5hcGR-bCF1OFakG7eeZXkn1gR9Ab4T4SPfcg7UzQ4Mt8SxC1czz07OBqx_eOUAGBfVahkp7FvbD99y0eJ2h2f_3LkicDT42vH2UhO6yL1OiH42QU1uTjSWAksVy5vQeDaYvWNLvT_Rp0ULBgGx32OiFQa1FnbVHeH8UztQXv44vVgapDUYq1QTCKiRFeX0-flTpqhjsc9U4pqO9pyVcdeS8gGRqLYLTcMIyXZT1IXiRqgW0US6SbkTo1-DWWHrfjlOCa6ZNM7w0u91hEXqFGuHtCiZ92Ikv1do8g7zNVt2p15EPrSpokwfc-jOwBE0i7671gFXiP1XabbSXdYwYgxCWU4JAEqu52bdlRo-b_Yl8GFfoA-IuKRVAftFBbw5Xf8xNklLVPuFzWAn5pH59n6_oGDBpzGfx1aHGs7MuOROgKkcvhIQ9UkeTomqeJrSz_tRrt4a8KI9cFbE9hVLyBR0wSNQAhRTFxlY_8a78r029ERdeN2ZmHNteeYUDYxgV5fCH9glc2LLSZC33qC4Ib5czFymWPO-3bOdpkYDM-QuX8Z06zT2vng7ODi-DK39ouvSMNQ.F-hzdEAqXIzAVrD0wK_nrw; customSettings_v4=%7B%22stylize%22%3A100%7D; darkMode=enabled; _ga_Q0DQ5L7K0D=GS1.1.1698725746.47.1.1698725784.0.0.0; AMP_MKTG_437c42b22c=JTdCJTdE; AMP_74801b10c7=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjJmMTFlNDU1NC1kYjBkLTRmY2EtODYxOS0zN2VlZDc3MmMxYjElMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjJmNjZiYTY1Ni1mYzFiLTQzNjYtOGVjOC1jZjUyY2JjNDczMDklMjIlMkMlMjJzZXNzaW9uSWQlMjIlM0ExNjk4Nzg2MzExNzI5JTJDJTIyb3B0T3V0JTIyJTNBZmFsc2UlMkMlMjJsYXN0RXZlbnRUaW1lJTIyJTNBMTY5ODc4NjMxMTczOSUyQyUyMmxhc3RFdmVudElkJTIyJTNBNTk2NSU3RA==; __Host-Midjourney.AuthUserToken=eyJpZFRva2VuIjoiZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNklqQmtNR1U0Tm1Ka05qUTNOREJqWVdReU5EYzFOakk0WkdFeVpXTTBPVFprWmpVeVlXUmlOV1FpTENKMGVYQWlPaUpLVjFRaWZRLmV5SnVZVzFsSWpvaVlTNXRZMlF1SWl3aWNHbGpkSFZ5WlNJNklqTmhOMlZpTmpNeVlUQXlZV1kxTVRRNVlXVmhPV0ZoTjJNeFpUaGhNV1F4SWl3aWJXbGthbTkxY201bGVWOXBaQ0k2SW1ZMk5tSmhOalUyTFdaak1XSXRORE0yTmkwNFpXTTRMV05tTlRKalltTTBOek13T1NJc0ltbHpjeUk2SW1oMGRIQnpPaTh2YzJWamRYSmxkRzlyWlc0dVoyOXZaMnhsTG1OdmJTOWhkWFJvYW05MWNtNWxlU0lzSW1GMVpDSTZJbUYxZEdocWIzVnlibVY1SWl3aVlYVjBhRjkwYVcxbElqb3hOams0TnpJME9EUXdMQ0oxYzJWeVgybGtJam9pUkhsbVpVcDJTbVYyWjFaaFl6RnJUbkJXT1dwTU9VbDJPRFIzTVNJc0luTjFZaUk2SWtSNVptVktka3BsZG1kV1lXTXhhMDV3VmpscVREbEpkamcwZHpFaUxDSnBZWFFpT2pFMk9UZzNPRGd5TURZc0ltVjRjQ0k2TVRZNU9EYzVNVGd3Tml3aVpXMWhhV3dpT2lKaGJtUnlaWGR0WTJSaGJrQm5iV0ZwYkM1amIyMGlMQ0psYldGcGJGOTJaWEpwWm1sbFpDSTZkSEoxWlN3aVptbHlaV0poYzJVaU9uc2lhV1JsYm5ScGRHbGxjeUk2ZXlKa2FYTmpiM0prTG1OdmJTSTZXeUl4TnpReU9UVXpPVEF3TmpneU56Y3lORGdpWFN3aVpXMWhhV3dpT2xzaVlXNWtjbVYzYldOa1lXNUFaMjFoYVd3dVkyOXRJbDE5TENKemFXZHVYMmx1WDNCeWIzWnBaR1Z5SWpvaVpHbHpZMjl5WkM1amIyMGlmWDAuQUVnZXdmeGtnOE03bnAyMDlzWXhYX2l1Yk9jbUhBRDlGSEtZOWYxWVhTWV9SLXFvUW1oWFhlbV9iQzN3Tnp5cVVOOUg4VTVxMkhxNWFXWkdnN3NDVFpzeEdyem9ZenMwMTRaQmxEaFpnTnNuWGU3ZXZlM2RwQktTR3J5Wkl0a3U4SDlCZjZwUlBlc1hiVzNoSmYycndhU1ZpMFRfUVhkUVREMEFTOVpNanE4Mm5NUmtORWVUSkVQdFBicVpkb3BqNU1WQXlrTlh2LTBoa3ZDOEFYY3g3dUhUOEdReWpkRkZKSW1yaTlxdEF1NVo4LVJPT21nbEJ6cVIzRktlNjhmaTlUZ0FZa3Y2ZmNfcXZ1R0pPUFo3VEFtenJwU1M0MlR0cmhlLU40YVBBZHJrYk9SQ2lVNEF2R1RUYWtpaVNSa3F6cHoxRnIzNXpHdDVkWVlXMVYwN3JRIiwicmVmcmVzaFRva2VuIjoiQU1mLXZCeTE5b052ZWt5WjZuNmd1a19IOGY2QjZ2eFB5WjYza3p0bHJ2TGZvT0Fld1N2Z2V1R0Z4dExCaldtaHZla1BpMlE2MkttSG9PNFZfd0pnQlZObHVIZ1p3RTFlQnJVVm40RE1pZVBzTXJjeEJLZ1pFRnF0dXB6NEk4b1dKUkJNSkdUam9ibnkwRnVncl9PeVdScFJWZHozMDlKcW9LLXRuZkpwV2dYOTEzTC1FSmlWU3ZEU1FOMVlCa0VVUjY2SHF4OE5CYmVlT3dIWE83NGl4eVBBc0ZNQU5iaXVIcTlQb2VQZGpZVUhjOV9EN2JyQmpVUVcyd1R5RWp3M3BQUGlCSG9Db0VFUTdQRTA5S2xiZlZoeWZJR1p1enQ4SWFEWE5FNjRpZjRwcDlEdVJ5bHBUbTdsRFNndWYwSmlsb0pZSXNHMHE2b1kifQ; __Host-Midjourney.AuthUserToken.sig=xWMt8i_Mic0DKM4lRZZe5tQmOF6cEe07Nycx451jZIk; __Host-Midjourney.AuthUser=eyJpZCI6IkR5ZmVKdkpldmdWYWMxa05wVjlqTDlJdjg0dzEiLCJtaWRqb3VybmV5X2lkIjoiZjY2YmE2NTYtZmMxYi00MzY2LThlYzgtY2Y1MmNiYzQ3MzA5IiwiZW1haWwiOiJhbmRyZXdtY2RhbkBnbWFpbC5jb20iLCJlbWFpbFZlcmlmaWVkIjp0cnVlLCJwaG9uZU51bWJlciI6bnVsbCwiZGlzcGxheU5hbWUiOiJhLm1jZC4iLCJwaG90b1VSTCI6IjNhN2ViNjMyYTAyYWY1MTQ5YWVhOWFhN2MxZThhMWQxIiwiYWJpbGl0aWVzIjp7ImFkbWluIjpmYWxzZSwiZGV2ZWxvcGVyIjpmYWxzZSwiYWNjZXB0ZWRfdG9zIjp0cnVlLCJtb2RlcmF0b3IiOmZhbHNlLCJndWlkZSI6ZmFsc2UsImNvbW11bml0eSI6ZmFsc2UsInZpcCI6ZmFsc2UsImVtcGxveWVlIjpmYWxzZSwiYWxsb3dfbnNmdyI6ZmFsc2UsInRlc3RlciI6ZmFsc2UsImNvb2xkb3duc19yZW1vdmVkIjpmYWxzZSwiYmxvY2tlZCI6ZmFsc2UsImNhbl90ZXN0IjpmYWxzZSwiaXNfc3Vic2NyaWJlciI6dHJ1ZSwiY2FuX3ByaXZhdGUiOmZhbHNlLCJjYW5fcmVsYXgiOnRydWUsImlzX3RyaWFsIjpmYWxzZX0sIndlYnNvY2tldEFjY2Vzc1Rva2VuIjoiZXlKMWMyVnlYMmxrSWpvaVpqWTJZbUUyTlRZdFptTXhZaTAwTXpZMkxUaGxZemd0WTJZMU1tTmlZelEzTXpBNUlpd2lkWE5sY201aGJXVWlPaUpoTG0xalpDNGlMQ0pwWVhRaU9qRTJPVGczT0RneU1EWjkuT1lGV0NKV0Q2MkYyNV9ndklXZ3NsVTBmRUxGbjJINllFbGRBdGpPUFNDTSJ9; cf_clearance=w8MaMzYWX4cGMUJUpRIcDkd7xkEO276g2ZnBytjp0ic-1698788207-0-1-e1a9dc1f.96e76b22.b7d06228-0.2.1698788207; __cf_bm=cs.Q.2NI5Y4Ra..RrZLX6_NkolZeKCkgyrJQ4I.1jqw-1698789198-0-AURckJp//6LSsRg+VrjNSJ5kYU0X1u4gdGBkRYlcKvOd0aSxeUGd+rDxmGdYs/ESoZvwyGys/zMH1EZy4Tvw59s=; _dd_s=; AMP_437c42b22c=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjIxNTkzOTUxMy1kOWVhLTQ2M2MtODAwMi0xMGQ1NWZiZGIzYjclMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjJmNjZiYTY1Ni1mYzFiLTQzNjYtOGVjOC1jZjUyY2JjNDczMDklMjIlMkMlMjJzZXNzaW9uSWQlMjIlM0ExNjk4Nzg2NjMxNTYxJTJDJTIyb3B0T3V0JTIyJTNBZmFsc2UlMkMlMjJsYXN0RXZlbnRUaW1lJTIyJTNBMTY5ODc4NjYzMTU5MiUyQyUyMmxhc3RFdmVudElkJTIyJTNBMzU2JTdE",
//     "Referer": "https://www.midjourney.com/imagine",
//     "Referrer-Policy": "origin-when-cross-origin"
//   },
//   "body": null,
//   "method": "GET"
// });

// fetch("https://www.midjourney.com/api/pg/thomas-jobs?user_id=f66ba656-fc1b-4366-8ec8-cf52cbc47309&page_size=10000", {
//   "headers": {
//     "accept": "*/*",
//     "accept-language": "en-US,en;q=0.9",
//     "cache-control": "no-cache",
//     "pragma": "no-cache",
//     "sec-ch-ua": "\"Chromium\";v=\"118\", \"Google Chrome\";v=\"118\", \"Not=A?Brand\";v=\"99\"",
//     "sec-ch-ua-mobile": "?0",
//     "sec-ch-ua-platform": "\"Windows\"",
//     "sec-fetch-dest": "empty",
//     "sec-fetch-mode": "cors",
//     "sec-fetch-site": "same-origin",
//     "cookie": "__Host-next-auth.csrf-token=8708880189128c65a35f9944423d2e3ac9301c55c8b191b4939b56fbdd80ce9e%7C95db751a4649b0620135d603c40764354d11b4cf41a80261609f05be4ab4a50b; imageSize=medium; imageLayout_2=hover; getImageAspect=2; fullWidth=false; showHoverIcons=true; _ga=GA1.1.167389610.1696560556; __stripe_mid=929458a4-208c-4767-9e7c-5268362f129fa1e2ec; intercom-id-gp8wgfwe=c08504b0-3745-497f-b33b-abc4fd1bf5cc; intercom-device-id-gp8wgfwe=ae7b76b3-959c-476e-86d9-f1f07410bd8f; __Secure-next-auth.callback-url=https%3A%2F%2Fwww.midjourney.com%2Fapp%2F; AMP_MKTG_74801b10c7=JTdCJTdE; __Secure-next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..PUJQUFlwtHAB9cCa.Hw6hAmOj-0jQqr6DymdN7JV17jwoi-1HzFEPSBQAtdtB3pFXAVDAUd6Jfap1Z2hCCQ4GbcxF7ubue3bEa7SeF7ldhRgCezkpEdtXDYDT-DuHGfFFeioNtJTHCihesKiZLEgulHEhrpYWzpaFxTp6hWErzAKco8cD9kkbs0AL5zHohyd9Z4Sjr-cXFvcCXDxmGq4FzLSNm2n7a_q7RPq9W7LMJUwBM5pV23SocxiGLxranapDIl7XqQaLCDlUpco83zWASQGkSTxRXyZxuGGu7BJrOkQuUub_oVbMxS76sSfP__ImwHtnlBDmGqM-8qJECSpj2uM35-U5I-SBjuw_wqBgcXT1_Mqy0rYsIZb25qUQ0vqhY9c86C9ye9rOROcZTOd5tLKgLrC0EGOD_1dicBjYbYZr7vuBYoX8BEPhgF768lhSWUfvwEiqd0dLMJUJKHHUs39_6GMDce_R1Z2VE_Nzn5ym8WwhLUVErhWEuDc880pZoJSvepsePVDYbNJZmWBzs2kYIM1ElEJXf3f9O8IGmgTcc1a3TGFzQB0PoLy2QXMhApBgcDK_5DiQXTrlnnPjwfvHxEdtpU87iuj-GcWi2qMuzD8Q1fzXgdKS1dJbFYQ8uo4Y1pL0Zy3p-ZhuZsCdbY-2J09JYkVofaqpP6Q36ufop3Fe6W7B1kAq9cySLIEOyefiw0g1ZfVhOCWvLWYmgzcZm5Kw23ferTPobh9h_HEl--0QuLaxQqtR7B4kEsKCTlEMyYw-5sygRystY3QX7BlDcD0dqtDMXx-CY_RgxAgfsQnmNDY7yd5OZH_d4mpWDVs2I1tb_lEy9vlK8U8NCM7moIV-8uuJANJM_x4dEtxzH-RjXrbaZvYBu6KkWhZWI_zfY2G-d-_o5guZLIWAVuJ1Ef8cGqvUM8z7DG9z-X5U81CUCttpuXMm5V5wY6bV2l4J7zfWXVhqdiT_IAK1_t6ZuEBuJtT7cPPzNecpovoHxfOVizO73DP_FLviu7Mgd9RtjxqGzxPLrQggL_5VsrSm6rtYuN6BchJEyktWGAe12eu9EuxS1U7qn52mhNpAvRfE61XZsj0cD_g_w9S_InMNkGtDz2Gug2JnjkSiGAfLNpKEeo_yxruqbbxHXc3mO6-SioWVbSioZkCzO-d5R9ehvwF_mg14FQW33ZvlCwTu7qisMkbybedGi3USSPAGBvuCVurwoJQQTavKXP60HtoNHG-AoifVDDwdlcrZfQjL_6VoZQ_74OjF2rkC4H5z3j09SlUj9rwLxvTLKwlKE66HeIdgO32EXQrJAPhQolnyH6aoxVotZEcZjMAGaOrs-to_lQc_1jbR0ftzi2r3LuNyy3IkrPMTLPOAV6sCAJOU9Stn5zhg2oSvhM7z-wocpcFtuR173zTrMXnFSGl_UfrKRTD4pug3PTsrmZTx0J3erSQJ9C0bnIp7FrdFZ1j4nlt_5ALgBlkpFKr9g8Rhpem_OzNekfthMWD_qpZMCHgHgFvOhZ2Ubanf-lK8syhv0oYhxwzmb0Xn_sBS_hjUkAuP4U1LxFJ2LsI_kEnR1vzq-8XLX-XUfVPrMMFOrR_a6yTq9dVzNFbiOgTAmSrvzOW24VRAVIz9c_Vxaw_8S5Tz2f95bKE1K45Cw3v57kWf1ftLhWs_H7MSApIXuBa12PAIsbmZUQ9mnKsrIh3t5rBtqPzgqtusR_R4WsT91z6LSxC3OzklWf6D8jARIs3Ltpg3IF2IvRSqv8IyMqxRIMdJHiqNryMm8DZIihSgzoStSSzcDBa5KwG1eaQE-hhBzFVeyT7yZ9KuNqUIgqc_xXGIsn-CZRH37Yqw0ZGZyRc3rqwjOygoBpDBl-GNCE5hcGR-bCF1OFakG7eeZXkn1gR9Ab4T4SPfcg7UzQ4Mt8SxC1czz07OBqx_eOUAGBfVahkp7FvbD99y0eJ2h2f_3LkicDT42vH2UhO6yL1OiH42QU1uTjSWAksVy5vQeDaYvWNLvT_Rp0ULBgGx32OiFQa1FnbVHeH8UztQXv44vVgapDUYq1QTCKiRFeX0-flTpqhjsc9U4pqO9pyVcdeS8gGRqLYLTcMIyXZT1IXiRqgW0US6SbkTo1-DWWHrfjlOCa6ZNM7w0u91hEXqFGuHtCiZ92Ikv1do8g7zNVt2p15EPrSpokwfc-jOwBE0i7671gFXiP1XabbSXdYwYgxCWU4JAEqu52bdlRo-b_Yl8GFfoA-IuKRVAftFBbw5Xf8xNklLVPuFzWAn5pH59n6_oGDBpzGfx1aHGs7MuOROgKkcvhIQ9UkeTomqeJrSz_tRrt4a8KI9cFbE9hVLyBR0wSNQAhRTFxlY_8a78r029ERdeN2ZmHNteeYUDYxgV5fCH9glc2LLSZC33qC4Ib5czFymWPO-3bOdpkYDM-QuX8Z06zT2vng7ODi-DK39ouvSMNQ.F-hzdEAqXIzAVrD0wK_nrw; customSettings_v4=%7B%22stylize%22%3A100%7D; darkMode=enabled; _ga_Q0DQ5L7K0D=GS1.1.1698725746.47.1.1698725784.0.0.0; AMP_MKTG_437c42b22c=JTdCJTdE; AMP_74801b10c7=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjJmMTFlNDU1NC1kYjBkLTRmY2EtODYxOS0zN2VlZDc3MmMxYjElMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjJmNjZiYTY1Ni1mYzFiLTQzNjYtOGVjOC1jZjUyY2JjNDczMDklMjIlMkMlMjJzZXNzaW9uSWQlMjIlM0ExNjk4Nzg2MzExNzI5JTJDJTIyb3B0T3V0JTIyJTNBZmFsc2UlMkMlMjJsYXN0RXZlbnRUaW1lJTIyJTNBMTY5ODc4NjMxMTczOSUyQyUyMmxhc3RFdmVudElkJTIyJTNBNTk2NSU3RA==; __Host-Midjourney.AuthUserToken=eyJpZFRva2VuIjoiZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNklqQmtNR1U0Tm1Ka05qUTNOREJqWVdReU5EYzFOakk0WkdFeVpXTTBPVFprWmpVeVlXUmlOV1FpTENKMGVYQWlPaUpLVjFRaWZRLmV5SnVZVzFsSWpvaVlTNXRZMlF1SWl3aWNHbGpkSFZ5WlNJNklqTmhOMlZpTmpNeVlUQXlZV1kxTVRRNVlXVmhPV0ZoTjJNeFpUaGhNV1F4SWl3aWJXbGthbTkxY201bGVWOXBaQ0k2SW1ZMk5tSmhOalUyTFdaak1XSXRORE0yTmkwNFpXTTRMV05tTlRKalltTTBOek13T1NJc0ltbHpjeUk2SW1oMGRIQnpPaTh2YzJWamRYSmxkRzlyWlc0dVoyOXZaMnhsTG1OdmJTOWhkWFJvYW05MWNtNWxlU0lzSW1GMVpDSTZJbUYxZEdocWIzVnlibVY1SWl3aVlYVjBhRjkwYVcxbElqb3hOams0TnpJME9EUXdMQ0oxYzJWeVgybGtJam9pUkhsbVpVcDJTbVYyWjFaaFl6RnJUbkJXT1dwTU9VbDJPRFIzTVNJc0luTjFZaUk2SWtSNVptVktka3BsZG1kV1lXTXhhMDV3VmpscVREbEpkamcwZHpFaUxDSnBZWFFpT2pFMk9UZzNPRGd5TURZc0ltVjRjQ0k2TVRZNU9EYzVNVGd3Tml3aVpXMWhhV3dpT2lKaGJtUnlaWGR0WTJSaGJrQm5iV0ZwYkM1amIyMGlMQ0psYldGcGJGOTJaWEpwWm1sbFpDSTZkSEoxWlN3aVptbHlaV0poYzJVaU9uc2lhV1JsYm5ScGRHbGxjeUk2ZXlKa2FYTmpiM0prTG1OdmJTSTZXeUl4TnpReU9UVXpPVEF3TmpneU56Y3lORGdpWFN3aVpXMWhhV3dpT2xzaVlXNWtjbVYzYldOa1lXNUFaMjFoYVd3dVkyOXRJbDE5TENKemFXZHVYMmx1WDNCeWIzWnBaR1Z5SWpvaVpHbHpZMjl5WkM1amIyMGlmWDAuQUVnZXdmeGtnOE03bnAyMDlzWXhYX2l1Yk9jbUhBRDlGSEtZOWYxWVhTWV9SLXFvUW1oWFhlbV9iQzN3Tnp5cVVOOUg4VTVxMkhxNWFXWkdnN3NDVFpzeEdyem9ZenMwMTRaQmxEaFpnTnNuWGU3ZXZlM2RwQktTR3J5Wkl0a3U4SDlCZjZwUlBlc1hiVzNoSmYycndhU1ZpMFRfUVhkUVREMEFTOVpNanE4Mm5NUmtORWVUSkVQdFBicVpkb3BqNU1WQXlrTlh2LTBoa3ZDOEFYY3g3dUhUOEdReWpkRkZKSW1yaTlxdEF1NVo4LVJPT21nbEJ6cVIzRktlNjhmaTlUZ0FZa3Y2ZmNfcXZ1R0pPUFo3VEFtenJwU1M0MlR0cmhlLU40YVBBZHJrYk9SQ2lVNEF2R1RUYWtpaVNSa3F6cHoxRnIzNXpHdDVkWVlXMVYwN3JRIiwicmVmcmVzaFRva2VuIjoiQU1mLXZCeTE5b052ZWt5WjZuNmd1a19IOGY2QjZ2eFB5WjYza3p0bHJ2TGZvT0Fld1N2Z2V1R0Z4dExCaldtaHZla1BpMlE2MkttSG9PNFZfd0pnQlZObHVIZ1p3RTFlQnJVVm40RE1pZVBzTXJjeEJLZ1pFRnF0dXB6NEk4b1dKUkJNSkdUam9ibnkwRnVncl9PeVdScFJWZHozMDlKcW9LLXRuZkpwV2dYOTEzTC1FSmlWU3ZEU1FOMVlCa0VVUjY2SHF4OE5CYmVlT3dIWE83NGl4eVBBc0ZNQU5iaXVIcTlQb2VQZGpZVUhjOV9EN2JyQmpVUVcyd1R5RWp3M3BQUGlCSG9Db0VFUTdQRTA5S2xiZlZoeWZJR1p1enQ4SWFEWE5FNjRpZjRwcDlEdVJ5bHBUbTdsRFNndWYwSmlsb0pZSXNHMHE2b1kifQ; __Host-Midjourney.AuthUserToken.sig=xWMt8i_Mic0DKM4lRZZe5tQmOF6cEe07Nycx451jZIk; __Host-Midjourney.AuthUser=eyJpZCI6IkR5ZmVKdkpldmdWYWMxa05wVjlqTDlJdjg0dzEiLCJtaWRqb3VybmV5X2lkIjoiZjY2YmE2NTYtZmMxYi00MzY2LThlYzgtY2Y1MmNiYzQ3MzA5IiwiZW1haWwiOiJhbmRyZXdtY2RhbkBnbWFpbC5jb20iLCJlbWFpbFZlcmlmaWVkIjp0cnVlLCJwaG9uZU51bWJlciI6bnVsbCwiZGlzcGxheU5hbWUiOiJhLm1jZC4iLCJwaG90b1VSTCI6IjNhN2ViNjMyYTAyYWY1MTQ5YWVhOWFhN2MxZThhMWQxIiwiYWJpbGl0aWVzIjp7ImFkbWluIjpmYWxzZSwiZGV2ZWxvcGVyIjpmYWxzZSwiYWNjZXB0ZWRfdG9zIjp0cnVlLCJtb2RlcmF0b3IiOmZhbHNlLCJndWlkZSI6ZmFsc2UsImNvbW11bml0eSI6ZmFsc2UsInZpcCI6ZmFsc2UsImVtcGxveWVlIjpmYWxzZSwiYWxsb3dfbnNmdyI6ZmFsc2UsInRlc3RlciI6ZmFsc2UsImNvb2xkb3duc19yZW1vdmVkIjpmYWxzZSwiYmxvY2tlZCI6ZmFsc2UsImNhbl90ZXN0IjpmYWxzZSwiaXNfc3Vic2NyaWJlciI6dHJ1ZSwiY2FuX3ByaXZhdGUiOmZhbHNlLCJjYW5fcmVsYXgiOnRydWUsImlzX3RyaWFsIjpmYWxzZX0sIndlYnNvY2tldEFjY2Vzc1Rva2VuIjoiZXlKMWMyVnlYMmxrSWpvaVpqWTJZbUUyTlRZdFptTXhZaTAwTXpZMkxUaGxZemd0WTJZMU1tTmlZelEzTXpBNUlpd2lkWE5sY201aGJXVWlPaUpoTG0xalpDNGlMQ0pwWVhRaU9qRTJPVGczT0RneU1EWjkuT1lGV0NKV0Q2MkYyNV9ndklXZ3NsVTBmRUxGbjJINllFbGRBdGpPUFNDTSJ9; cf_clearance=w8MaMzYWX4cGMUJUpRIcDkd7xkEO276g2ZnBytjp0ic-1698788207-0-1-e1a9dc1f.96e76b22.b7d06228-0.2.1698788207; __cf_bm=cs.Q.2NI5Y4Ra..RrZLX6_NkolZeKCkgyrJQ4I.1jqw-1698789198-0-AURckJp//6LSsRg+VrjNSJ5kYU0X1u4gdGBkRYlcKvOd0aSxeUGd+rDxmGdYs/ESoZvwyGys/zMH1EZy4Tvw59s=; _dd_s=; AMP_437c42b22c=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjIxNTkzOTUxMy1kOWVhLTQ2M2MtODAwMi0xMGQ1NWZiZGIzYjclMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjJmNjZiYTY1Ni1mYzFiLTQzNjYtOGVjOC1jZjUyY2JjNDczMDklMjIlMkMlMjJzZXNzaW9uSWQlMjIlM0ExNjk4Nzg2NjMxNTYxJTJDJTIyb3B0T3V0JTIyJTNBZmFsc2UlMkMlMjJsYXN0RXZlbnRUaW1lJTIyJTNBMTY5ODc4NjYzMTU5MiUyQyUyMmxhc3RFdmVudElkJTIyJTNBMzU2JTdE",
//     "Referer": "https://www.midjourney.com/imagine",
//     "Referrer-Policy": "origin-when-cross-origin"
//   },
//   "body": null,
//   "method": "GET"
// });