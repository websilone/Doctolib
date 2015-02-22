var gulp = require('gulp');
var less = require('gulp-less');

gulp.task('default', function () {
    return gulp
        .src('less/style.less')
        .pipe(less())
        .pipe(gulp.dest('./'));
});

gulp.task('watch', function () {
    gulp.watch('less/*.less', ['default']);
});