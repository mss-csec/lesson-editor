'use strict';

const gulp = require('gulp'),
      babel = require('gulp-babel'),
      rename = require('gulp-rename'),
      sourcemaps = require('gulp-sourcemaps');

gulp.task('build', () => {
  gulp.src('assets/*.es6')
    .pipe(rename({ extname: '.js' }))
    .pipe(sourcemaps.init())
    .pipe(babel({ presets: ['env'] }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('assets'))
});

gulp.task('watch', ['build'], () => {
  gulp.watch('assets/*.es6', ['build']);
});

gulp.task('default', ['build']);
