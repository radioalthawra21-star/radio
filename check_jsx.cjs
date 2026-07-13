const esbuild = require('E:/موقع راديو الثورة/1‏‏dd -copy with money & NEWS/frontend/node_modules/esbuild');
const target = 'E:/موقع راديو الثورة/1‏‏dd -copy with money & NEWS/frontend/src/pages/Admin/AdminDashboard.jsx';
esbuild.build({
  entryPoints: [target],
  bundle: true,
  loader: { '.jsx': 'jsx', '.js': 'jsx' },
  external: ['react', 'react-dom', 'react-router-dom'],
  format: 'esm',
  outfile: 'C:/Users/C-1~1/AppData/Local/Temp/opencode/admin_check.js',
  logLevel: 'info'
}).then(() => {
  console.log('OK: AdminDashboard.jsx parsed and bundled successfully');
}).catch((e) => {
  console.error('BUILD ERROR:', e.message);
  if (e.errors) e.errors.forEach(err => console.error(JSON.stringify(err, null, 2)));
  process.exit(1);
});