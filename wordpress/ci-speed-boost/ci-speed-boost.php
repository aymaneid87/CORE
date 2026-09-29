<?php
/**
 * Plugin Name: CI Speed Boost
 * Description: تسريع موقع ci-eg.com على الموبايل — تأجيل ملفات JS، تخفيف خطوط Google، وإلغاء سكربتات غير ضرورية. للإيقاف: عطّل الإضافة. للمقارنة: افتح أي صفحة وأضف ?nospeed=1
 * Version: 1.1.0
 * Requires at least: 6.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/*
 * 0) Page cache for visitors.
 *    Files in mu-plugins load before normal plugins and the theme, so a cached
 *    page is sent without loading Elementor, Slider Revolution, etc.
 *    To clear the cache: delete the folder wp-content/cache/ci-speed-boost
 */
define( 'CISB_CACHE_DIR', WP_CONTENT_DIR . '/cache/ci-speed-boost' );
define( 'CISB_CACHE_TTL', 6 * HOUR_IN_SECONDS );

function cisb_cache_file() {
	$ua     = isset( $_SERVER['HTTP_USER_AGENT'] ) ? $_SERVER['HTTP_USER_AGENT'] : '';
	$device = preg_match( '/Mobile|Android|Silk\/|Kindle|BlackBerry|Opera Mini|Opera Mobi|iPhone|iPad/i', $ua ) ? 'm' : 'd';
	$https  = ( ! empty( $_SERVER['HTTPS'] ) && 'off' !== $_SERVER['HTTPS'] ) || ( isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) && 'https' === $_SERVER['HTTP_X_FORWARDED_PROTO'] ) ? 's' : 'h';
	$host   = isset( $_SERVER['HTTP_HOST'] ) ? strtolower( $_SERVER['HTTP_HOST'] ) : '';
	$path   = strtok( $_SERVER['REQUEST_URI'], '?' );
	return CISB_CACHE_DIR . '/' . md5( $https . $host . $path ) . '-' . $device . '.html';
}

function cisb_cacheable_request() {
	if ( ( defined( 'WP_CLI' ) && WP_CLI ) || ( defined( 'DOING_CRON' ) && DOING_CRON ) || ( defined( 'DOING_AJAX' ) && DOING_AJAX ) ) {
		return false;
	}
	if ( ! isset( $_SERVER['REQUEST_METHOD'] ) || 'GET' !== $_SERVER['REQUEST_METHOD'] || ! isset( $_SERVER['REQUEST_URI'] ) ) {
		return false;
	}
	if ( ! empty( $_GET ) ) {
		return false;
	}
	$uri = $_SERVER['REQUEST_URI'];
	if ( preg_match( '#^/(wp-admin|wp-login|wp-json|wp-cron|xmlrpc|feed)|/feed/?$|\.(php|xml|txt)$#', $uri ) ) {
		return false;
	}
	foreach ( array_keys( $_COOKIE ) as $c ) {
		if ( preg_match( '/^(wordpress_logged_in_|wordpress_sec_|wp-postpass_|comment_author_|woocommerce_|wp_woocommerce_session_)/', $c ) ) {
			return false;
		}
	}
	return true;
}

if ( cisb_cacheable_request() ) {
	$cisb_file = cisb_cache_file();
	if ( is_file( $cisb_file ) && ( time() - filemtime( $cisb_file ) ) < CISB_CACHE_TTL ) {
		header( 'Content-Type: text/html; charset=UTF-8' );
		header( 'X-CISB-Cache: HIT' );
		header( 'Cache-Control: no-cache' );
		readfile( $cisb_file );
		exit;
	}
	add_action( 'template_redirect', function () {
		if ( is_user_logged_in() || is_404() || is_search() || is_preview() || is_feed() || post_password_required() ) {
			return;
		}
		header( 'X-CISB-Cache: MISS' );
		ob_start( function ( $html, $phase ) {
			// Only cache when the whole page arrives in one piece.
			if ( ! ( $phase & PHP_OUTPUT_HANDLER_START ) || ! ( $phase & PHP_OUTPUT_HANDLER_FINAL ) ) {
				return $html;
			}
			if ( defined( 'DONOTCACHEPAGE' ) && DONOTCACHEPAGE ) {
				return $html;
			}
			if ( 200 !== http_response_code() || strlen( $html ) < 1000 || false === stripos( $html, '<html' ) || false === stripos( $html, '</html>' ) ) {
				return $html;
			}
			foreach ( headers_list() as $h ) {
				if ( 0 === stripos( $h, 'Location:' ) || 0 === stripos( $h, 'Set-Cookie:' ) ) {
					return $html;
				}
			}
			if ( ! is_dir( CISB_CACHE_DIR ) ) {
				wp_mkdir_p( CISB_CACHE_DIR );
			}
			$file = cisb_cache_file();
			$tmp  = $file . '.' . uniqid( '', true ) . '.tmp';
			if ( false !== @file_put_contents( $tmp, $html . "\n<!-- cached by CI Speed Boost " . gmdate( 'c' ) . ' -->' ) ) {
				@rename( $tmp, $file );
			}
			return $html;
		} );
	}, 0 );
}

function cisb_purge_cache() {
	foreach ( (array) glob( CISB_CACHE_DIR . '/*' ) as $f ) {
		if ( is_file( $f ) ) {
			@unlink( $f );
		}
	}
}
foreach ( array( 'save_post', 'deleted_post', 'trashed_post', 'edit_attachment', 'switch_theme', 'customize_save_after', 'wp_update_nav_menu', 'activated_plugin', 'deactivated_plugin', 'upgrader_process_complete', 'comment_post', 'edit_comment', 'wp_set_comment_status', 'elementor/editor/after_save', 'elementor/core/files/clear_cache', 'update_option_sidebars_widgets', 'update_option_elementor_active_kit' ) as $cisb_hook ) {
	add_action( $cisb_hook, 'cisb_purge_cache' );
}

function cisb_enabled() {
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return false;
	}
	if ( isset( $_GET['nospeed'] ) || isset( $_GET['elementor-preview'] ) ) {
		return false;
	}
	return true;
}

/*
 * 1) Defer JavaScript using WordPress' own loading strategy API.
 *    WordPress automatically keeps a script blocking when something depends on it
 *    in a way that would break, so this is the safe way to defer.
 */
add_action( 'wp_print_scripts', function () {
	if ( ! cisb_enabled() ) {
		return;
	}
	$keep_blocking = array( 'jquery', 'jquery-core', 'jquery-migrate' );
	foreach ( wp_scripts()->registered as $handle => $script ) {
		if ( in_array( $handle, $keep_blocking, true ) ) {
			continue;
		}
		// Slider Revolution prints its own inline init code in the page body.
		if ( is_string( $script->src ) && ( false !== strpos( $script->src, '/revslider/' ) || false !== strpos( $handle, 'revslider' ) || 0 === strpos( $handle, 'sr7' ) || 'tp-tools' === $handle ) ) {
			continue;
		}
		if ( empty( $script->extra['strategy'] ) ) {
			wp_script_add_data( $handle, 'strategy', 'defer' );
		}
	}
}, 1 );

/*
 * 2) Google Fonts: drop italic variants and keep only weights 400–700.
 *    The site currently requests ~60 font files; this cuts it to ~15.
 */
function cisb_slim_google_fonts( $src ) {
	if ( ! is_string( $src ) || false === strpos( $src, 'fonts.googleapis.com' ) ) {
		return $src;
	}
	$keep = array( '400', '500', '600', '700' );
	$src  = str_replace( '&#038;', '&', $src );
	$parts = wp_parse_url( $src );
	if ( empty( $parts['query'] ) ) {
		return $src;
	}
	$query = $parts['query'];

	if ( false !== strpos( $parts['path'], 'css2' ) ) {
		// css2 syntax: family=Name:ital,wght@0,300;0,400;1,400
		$query = preg_replace_callback( '/family=([^&:]+):ital,wght@([^&]+)/', function ( $m ) use ( $keep ) {
			$w = array();
			foreach ( explode( ';', $m[2] ) as $pair ) {
				list( $ital, $weight ) = array_pad( explode( ',', $pair ), 2, '' );
				if ( '0' === $ital && in_array( $weight, $keep, true ) ) {
					$w[] = $weight;
				}
			}
			return $w ? 'family=' . $m[1] . ':wght@' . implode( ';', $w ) : 'family=' . $m[1];
		}, $query );
	} else {
		// css (v1) syntax: family=Poppins:100,100italic,...|Mulish:...
		$query = preg_replace_callback( '/family=([^&]+)/', function ( $m ) use ( $keep ) {
			$families = preg_split( '/\||%7C/i', urldecode( $m[1] ) );
			$out      = array();
			foreach ( $families as $fam ) {
				list( $name, $variants ) = array_pad( explode( ':', $fam, 2 ), 2, '' );
				if ( '' === $variants ) {
					$out[] = $name;
					continue;
				}
				$w = array_intersect( explode( ',', $variants ), $keep );
				$out[] = $w ? $name . ':' . implode( ',', $w ) : $name;
			}
			return 'family=' . str_replace( '%2B', '+', rawurlencode( implode( '|', $out ) ) );
		}, $query );
		$query = str_replace( '%7C', '|', $query );
		$query = str_replace( '%3A', ':', str_replace( '%2C', ',', $query ) );
	}
	if ( false === strpos( $query, 'display=' ) ) {
		$query .= '&display=swap';
	}
	$scheme = isset( $parts['scheme'] ) ? $parts['scheme'] . ':' : 'https:';
	return $scheme . '//' . $parts['host'] . $parts['path'] . '?' . $query;
}
add_filter( 'style_loader_src', function ( $src ) {
	return cisb_enabled() ? cisb_slim_google_fonts( $src ) : $src;
}, 20 );

// Connect to the font servers early.
add_action( 'wp_head', function () {
	if ( ! cisb_enabled() ) {
		return;
	}
	echo "<link rel='preconnect' href='https://fonts.googleapis.com'>\n";
	echo "<link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>\n";
}, 1 );

/*
 * 3) Remove things the site does not need on the front end.
 */
add_action( 'init', function () {
	if ( ! cisb_enabled() ) {
		return;
	}
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'wp_head', 'wp_oembed_add_host_js' );
	remove_action( 'wp_head', 'rsd_link' );
	remove_action( 'wp_head', 'wlwmanifest_link' );
} );

add_action( 'wp_enqueue_scripts', function () {
	if ( ! cisb_enabled() ) {
		return;
	}
	// Block editor styles are not used by the Elementor-built pages.
	foreach ( array( 'wp-block-library', 'wp-block-library-theme', 'global-styles', 'classic-theme-styles' ) as $h ) {
		wp_dequeue_style( $h );
	}
}, 100 );

/*
 * 4) Slider Revolution loads ~110 KB of JavaScript on every page, even pages
 *    without a slider. Remove its files from pages that have no slider.
 */
add_action( 'template_redirect', function () {
	if ( ! cisb_enabled() ) {
		return;
	}
	ob_start( function ( $html ) {
		if ( false === stripos( $html, '</html>' ) || false !== stripos( $html, '<sr7-module' ) || false !== stripos( $html, '<rs-module' ) ) {
			return $html;
		}
		return preg_replace( array(
			"#<script[^>]*id=['\"](tp-tools-js|sr7-js)['\"][^>]*></script>\s*#i",
			"#<link[^>]*id=['\"]sr7css-css['\"][^>]*>\s*#i",
		), '', $html );
	} );
}, 1 );

// Slow down the WordPress heartbeat (reduces server load).
add_filter( 'heartbeat_settings', function ( $s ) {
	$s['interval'] = 60;
	return $s;
} );
