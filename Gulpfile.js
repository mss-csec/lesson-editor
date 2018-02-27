'use strict';

const gulp = require('gulp'),
      postcss = require('gulp-postcss'),
      sourcemaps = require('gulp-sourcemaps'),
      { scripts } = require('./tasks/webpack');

gulp.task('build:js', gulp.series(scripts));

gulp.task('build:css', () => {
  return gulp.src('app/app.css')
    .pipe(sourcemaps.init())
    .pipe(postcss())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('assets/'));
})

gulp.task('build', gulp.parallel('build:js', 'build:css'));

gulp.task('watch', gulp.series('build', function watchInside() {
  gulp.watch([ 'app/*.js', 'app/**/*.jsx' ], gulp.series('build:js'));
  gulp.watch('app/*.css', gulp.series('build:css'));
}));

gulp.task('default', gulp.series('build'));
