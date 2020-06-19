/**
 * Gulp build code for resources
 */

const gulp = require('gulp');
const cssnano = require('gulp-cssnano');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');

gulp.task('build-scss', () => {
    return gulp.src('./resources/scss/influx.scss')
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(cssnano({
            autoprefixer: { browsers: 'last 2 versions', add: true }
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist/'));
});
