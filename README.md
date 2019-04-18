An Electron-based app for Windows, OS X, and Linux to view offline Photosynths and panoramas

### Build Instructions
#### Install Node.js with NPM. Run the following inside this directory
```
npm install
npm run release
```
After building, the installer will be in the `dist` directory.  A portable distribution will be there as well.
### Folder Structure
`app/ps1` contains the photosynth 1 viewer (based on chrome extension experiment)

`app/ps2` contains the photosynth 2 viewer (technical preview)

`app/pano/jspanoviewer.js` contains the panorama viewer

`app/zip_server.js` contains the code for reading from zip files


### Related:
- https://twitter.com/jgstew/status/1118936773558538241
- https://github.com/alicevision/meshroom
  - https://twitter.com/kaflurbaleen/status/1118938053626564608
