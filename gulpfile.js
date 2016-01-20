'use strict';

var gulp = require('gulp'),
    iconfont = require('gulp-iconfont'),
    consolidate = require('gulp-consolidate'),
    sass = require('gulp-sass'),
    rename = require("gulp-rename"),
    clean = require('gulp-clean'),
    exec = require('child_process').exec,
    replace = require('gulp-replace'),
    bower = require('./bower.json'),
    fs = require('fs'),
    util = require('gulp-util'),
    projectPackage = require('./package.json'),
    semver = require('semver'),
    inquirer = require('inquirer');

var srcDir = './src/';
var fontName = projectPackage.name;

gulp.task('clean', function () {

    return gulp.src(['./style/', './fonts/', './demo/'], {read: false})
        .pipe(clean());

});

gulp.task('build', ['clean'], function () {

    return gulp.src(['./src/svg/*.svg'])
        .pipe(iconfont({
            fontName: fontName,
            fontHeight: 1024,
            normalize: true,
            appendUnicode: true,
            descent: 160,
            formats: ['ttf', 'eot', 'svg', 'woff', 'woff2']
        }))
        .on('glyphs', function (glyphs) {
            var options = {
                glyphs: glyphs.map(function (glyph) {
                    // this line is needed because gulp-iconfont has changed the api from 2.0
                    return {
                        name: glyph.name,
                        codepoint: glyph.unicode[0].charCodeAt(0).toString(16).toUpperCase(),
                        unicode: glyph.unicode[0]
                    }
                }),
                fontName: fontName,
                fontPath: '../fonts/', // set path to font (from your CSS file if relative)
                cssClass: fontName // set class name in your CSS
            };

            // build the icon font CSS and SCSS
            gulp.src('./src/styles/style.scss')
                .pipe(consolidate('lodash', options))
                .pipe(gulp.dest('./styles/'))
                .pipe(sass().on('error', sass.logError))
                .pipe(gulp.dest('./styles/'));

            // build the demo html
            gulp.src('./src/demo/**/*.html')
                .pipe(consolidate('lodash', options))
                .pipe(gulp.dest('./demo/'));

            // build the demo CSS
            gulp.src('./src/demo/styles/**/*')
                .pipe(consolidate('lodash', options))
                .pipe(sass().on('error', sass.logError))
                .pipe(gulp.dest('./demo/styles/'));

            // build the list of main files for bower.json
            var mainFiles = [
                'styles/style.scss',
                'styles/style.css',
                'fonts/' + fontName + '.eot',
                'fonts/' + fontName + '.svg',
                'fonts/' + fontName + '.ttf',
                'fonts/' + fontName + '.woff',
                'fonts/' + fontName + '.woff2'
            ];

            // update the "main" node of the bower object
            bower.main = mainFiles;

            // write the object to bower.json
            fs.writeFileSync('bower.json', JSON.stringify(bower, null, 2));

        })
        .pipe(gulp.dest('./fonts/'));
});

gulp.task('watch', function () {
    gulp.watch(['./src/**/*'], ['fonts']);
});


// bump the version interactively
gulp.task('bump', function (complete) {
    util.log('Current version:', util.colors.cyan(projectPackage.version));
    var choices = ['major', 'premajor', 'minor', 'preminor', 'patch', 'prepatch', 'prerelease'].map(function (versionType) {
        return versionType + ' (v' + semver.inc(projectPackage.version, versionType) + ')';
    });
    inquirer.prompt({
        type: 'list',
        name: 'version',
        message: 'What version update would you like?',
        choices: choices
    }, function (res) {
        var increment = res.version.split(' ')[0],
            newVersion = semver.inc(projectPackage.version, increment);

        // Set the new versions into the bower/package object
        projectPackage.version = newVersion;
        bower.version = newVersion;

        // Write these to their own files, then build the output
        fs.writeFileSync('package.json', JSON.stringify(projectPackage, null, 2));
        fs.writeFileSync('bower.json', JSON.stringify(bower, null, 2));

        complete();
    });
});

// create a release and tag it in git
gulp.task('release', ['build'], function () {
    exec('git tag -a v' + projectPackage.version);
});

gulp.task('default', function () {
    gulp.start('build');
});