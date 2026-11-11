if (new URLSearchParams(location.search).get('experience') === 'salon') {
  import('./main');
} else {
  import('./escape/app').catch(error => {
    console.error(error);
    const app = document.querySelector('#app');
    if (app) app.innerHTML = '<div style="padding:3rem;background:#142321;color:#eee;font:18px Georgia"><h1>The museum could not open</h1><p>Please reload. This experience needs a browser with WebGL enabled.</p><button onclick="location.reload()">Try again</button></div>';
  });
}
