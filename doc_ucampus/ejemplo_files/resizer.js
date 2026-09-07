function resizer() {};

var u_height = 0;
var u_timer = null;
var u_lock = false;

var ifr;
function resizer_resizer_6a9e4ab0003cb( e ) {
	ifr = document.getElementById( 'resizer_6a9e4ab0003cb' );
	if( ! ifr ) {
		ifr = document.createElement( 'iframe' );
		ifr.id = 'resizer_6a9e4ab0003cb';
		ifr.style.width = 0;
		ifr.style.height = 0;
		ifr.style.visibility = 'hidden';
		ifr.onload = function() { u_lock = false; }
		document.body.appendChild( ifr );
	}

	var width = e && e.type == 'load' ? 0 : Math.max( document.body.scrollWidth, document.documentElement.scrollWidth, document.body.offsetWidth, document.documentElement.offsetWidth, document.body.clientWidth, document.documentElement.clientWidth );
	var height = Math.ceil( document.getElementById( 'resizer_6a9e4ab0003cb' ).getBoundingClientRect().top - document.body.getBoundingClientRect().top ) + 30;

	if( ! u_lock && ( height != u_height || width != u_width ) ) {
		u_height = height;
		u_width = width;
		u_lock = true;
		//console.log( e ? e.type : '-', height, width );

		load_resizer_6a9e4ab0003cb( 'https://ucampus.uchile.cl/b/externos/_resizer?_LB=uchile01-int&height='+height+'&width='+width+'&rdm=resizer_6a9e4ab0003cb&url='+encodeURIComponent( window.location.href ) );
	}

	if( u_timer ) clearTimeout( u_timer );
	u_timer = setTimeout( resizer_resizer_6a9e4ab0003cb, width == 0 ? 500 : 1000 );
}

function load_resizer_6a9e4ab0003cb( url ) {
	var ifr2 = document.createElement( 'iframe' );
	ifr2.id = 'resizer_6a9e4ab0003cb';
	ifr2.style.width = 0;
	ifr2.style.height = 0;
	ifr2.style.visibility = 'hidden';
	ifr2.onload = function() { u_lock = false; }
	ifr2.src = url;
	ifr.parentNode.replaceChild( ifr2, ifr );
	ifr = ifr2;
}

function anchor_resizer_6a9e4ab0003cb( e ) {
	try {
		var t = ( window.e || e ).target;
		if( t.tagName !== 'A' ) return;

		if( m = t.href.match( /^[^#]*#(.*)/i ) ) {
			var o = document.getElementById( m[1] );
			if( ! o ) return;

			load_resizer_6a9e4ab0003cb( 'https://ucampus.uchile.cl/b/externos/_resizer?_LB=uchile01-int&scroll='+o.offsetTop );
		}

	} catch( ex ) {
		console.log( ex );
	}
}

window.addEventListener ? window.addEventListener( 'load', resizer_resizer_6a9e4ab0003cb, false ) : window.attachEvent( 'onload', resizer_resizer_6a9e4ab0003cb );
window.addEventListener ? window.addEventListener( 'resize', resizer_resizer_6a9e4ab0003cb, false ) : window.attachEvent( 'onresize', resizer_resizer_6a9e4ab0003cb );
window.addEventListener ? window.addEventListener( 'click', anchor_resizer_6a9e4ab0003cb, false ) : window.attachEvent( 'click', anchor_resizer_6a9e4ab0003cb );