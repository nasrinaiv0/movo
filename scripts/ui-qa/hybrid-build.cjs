const webpack=require('webpack'),path=require('path'),fs=require('fs');
const output='/tmp/movo-hybrid-qa';
webpack({mode:'production',entry:path.resolve('scripts/ui-qa/hybrid-entry.js'),output:{path:output,filename:'qa.js'},
 module:{rules:[{test:/\.js$/,exclude:/node_modules/,use:{loader:require.resolve('babel-loader'),options:{presets:[require.resolve('babel-preset-react-app')],babelrc:false}}}]},
 plugins:[new webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('production')})]},(error,stats)=>{
 if(error||stats.hasErrors()){console.error(error||stats.toString({all:false,errors:true}));process.exitCode=1;return;}
 fs.writeFileSync(output+'/index.html','<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><script src="/qa.js"></script><title>MOVO isolated hybrid QA</title>');
 console.log('Hybrid browser fixture built');
});
