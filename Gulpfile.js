'use strict';

const gulp = require('gulp'),
      babel = require('gulp-babel'),
      rename = require('gulp-rename'),
      sourcemaps = require('gulp-sourcemaps');

gulp.task('build', () => {
  gulp.src('assets/app.es6')
    .pipe(rename({ extname: '.js' }))
    .pipe(sourcemaps.init())
    .pipe(babel({ presets: ['env'] }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('assets'))
});

gulp.task('watch', () => {
  gulp.watch('assets/app.es6', ['build']);
});

gulp.task('default', ['build']);
