import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import browserSync from 'browser-sync';
import del from 'del';
import {stream as wiredep} from 'wiredep';

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

gulp.task('views', () => {
  return gulp.src('app/templates/pages/*.jade')
    .pipe($.plumber())
    .pipe($.jade({pretty: true}).on('error', function(err) {
      console.log(err);
    }))
    .pipe(gulp.dest('.tmp'))
    .pipe(reload({stream: true}));
});

// gulp.task('styles', () => {
//   return gulp.src('app/styles/*.scss')
//     .pipe($.plumber())
//     .pipe($.sourcemaps.init())
//     .pipe($.sass.sync({
//       outputStyle: 'expanded',
//       precision: 10,
//       includePaths: ['.']
//     }).on('error', $.sass.logError))
//     .pipe($.autoprefixer({browsers: ['last 1 version']}))
//     //.pipe($.csscomb())
//     .pipe($.sourcemaps.write())
//     .pipe(gulp.dest('.tmp/styles'))
//     .pipe(reload({stream: true}));
// });

gulp.task('styles', () => {
  return gulp.src('app/styles/*.sass')
    .pipe($.plumber())
    // .pipe($.sourcemaps.init())
    .pipe($.sass.sync({
      indentedSyntax: true,
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', $.sass.logError))
    .pipe($.autoprefixer({browsers: ['last 1 version']}))
    //.pipe($.csscomb())
    // .pipe($.sourcemaps.write('./'))
    .pipe(gulp.dest('.tmp/styles'))
    .pipe(reload({stream: true}));
});

function lint(files, options) {
  return () => {
    return gulp.src(files)
      .pipe(reload({stream: true, once: true}))
      .pipe($.eslint(options))
      .pipe($.eslint.format())
      .pipe($.if(!browserSync.active, $.eslint.failAfterError()));
  };
}
const testLintOptions = {
  env: {
    mocha: true
  },
  globals: {
    assert: false,
    expect: false,
    should: false
  }
};

gulp.task('lint', lint(['app/scripts/**/*.js', '!app/scripts/vendor/**/*.js']));
gulp.task('lint:test', lint('test/spec/**/*.js', testLintOptions));

gulp.task('html', ['views', 'styles'], () => {
  const assets = $.useref.assets({searchPath: ['.tmp', 'app', '.']});

  return gulp.src(['app/*.html', '.tmp/*.html'])
    .pipe(assets)
    // .pipe($.if('*.js', $.uglify()))
    // .pipe($.if('*.css', $.minifyCss({compatibility: '*'})))
    .pipe(assets.restore())
    .pipe($.useref())
    //.pipe($.if('*.html', $.minifyHtml({conditionals: true, loose: true})))
    .pipe(gulp.dest('dist'));
});

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
    .pipe($.if($.if.isFile, $.cache($.imagemin({
      progressive: true,
      interlaced: true,
      // don't remove IDs from SVGs, they are often used
      // as hooks for embedding and styling
      svgoPlugins: [{cleanupIDs: false}]
    }))
    .on('error', function (err) {
      console.log(err);
      this.end();
    })))
    .pipe(gulp.dest('dist/images'));
});

gulp.task('sprite', function () {
  // Generate our spritesheet
  var spriteData = gulp.src('app/images/sprite/*.png').pipe($.spritesmith({
      imgName: 'sprite.png',
      cssName: '_sprite.sass',
      cssTemplate: 'sass.template.mustache',
      algorithm: 'binary-tree',
      padding: 8
  }));

  // Pipe image stream through image optimizer and onto disk
  spriteData.img
    .pipe(gulp.dest('app/images'));

  // Pipe CSS stream through CSS optimizer and onto disk
  spriteData.css
    .pipe(gulp.dest('app/styles/'));
});

gulp.task('fonts', () => {
  return gulp.src(require('main-bower-files')({
    filter: '**/*.{eot,svg,ttf,woff,woff2}'
  }).concat('app/fonts/**/*'))
    .pipe(gulp.dest('.tmp/fonts'))
    .pipe(gulp.dest('dist/fonts'));
});

gulp.task('extras', () => {
  return gulp.src([
    'app/*.*',
    '!app/*.html',
    '!app/templates/*.jade'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('watch', ['views', 'styles', 'fonts'], () => {
  browserSync({
    notify: false,
    port: 9000,
    open: false,
    server: {
      baseDir: ['.tmp', 'app'],
      routes: {
        '/components': 'components'
      }
    }
  });

  gulp.watch([
    'app/*.html',
    '.tmp/*.html',
    'app/scripts/**/*.js',
    'app/images/**/*',
    '.tmp/fonts/**/*'
  ]).on('change', reload);
  
  gulp.watch('app/templates/**/*.jade', ['views']);
  gulp.watch('app/styles/**/*.sass', ['styles']);
  gulp.watch('app/fonts/**/*', ['fonts']);
  gulp.watch('app/images/sprite/*.png', ['sprite']);
  gulp.watch('bower.json', ['wiredep', 'fonts']);
});

gulp.task('watch:dist', () => {
  browserSync({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['dist']
    }
  });
});

// gulp.task('watch:test', () => {
//   browserSync({
//     notify: false,
//     port: 9000,
//     ui: false,
//     server: {
//       baseDir: 'test',
//       routes: {
//         '/components': 'components'
//       }
//     }
//   });

//   gulp.watch('test/spec/**/*.js').on('change', reload);
//   gulp.watch('test/spec/**/*.js', ['lint:test']);
// });

// inject bower components
gulp.task('wiredep', () => {
  gulp.src('app/styles/*.sass')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)+/
    }))
    .pipe(gulp.dest('app/styles'));

  gulp.src('app/templates/**/*.jade')
    .pipe(wiredep({
      exclude: ['bootstrap-sass', 'jquery', 'modernizr'],
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest('app/templates'));
});

gulp.task('build', ['lint', 'html', 'images', 'fonts', 'extras'], () => {
  return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});

gulp.task('default', ['clean'], () => {
  gulp.start('watch');
});
