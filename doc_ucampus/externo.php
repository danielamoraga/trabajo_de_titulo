Ejemplo de implementación de Servicio Externo
php

// chequeamos librerias basicas
if( ! extension_loaded( 'json' ) ) exit( 'Falta la librería JSON' );

// vemos si viene el ticket
if( ! $_GET['ticket'] ) exit( 'Falta la información del ticket. $_GET: '.var_export( $_GET, TRUE ) );

// cargamos el ticket
$json = file_get_contents( 'https://ucampus.uchile.cl/b/externos/datos?ticket='.$_GET['ticket'] );
if( ! $json ) exit( 'No se pudo cargar la url de Ucampus con los datos. ERROR: '.error_get_last() );

// decodificamos la informacion
$datos = json_decode( $json, TRUE );
if( ! $datos ) exit( 'Los datos de Ucampus vienen corruptos. $datos: '.var_export( $json, TRUE ) );

// chequeamos que no sea un mensaje excesivamente viejo
if( time() - $datos['time'] > 60 ) exit( 'La información de conexión está caducada. Hora del servidor: '.date( 'd/m/Y H:i:s' ) );

// creamos la sesion
session_start();

// importante para evitar session fixation
session_regenerate_id();

// importante! dado que el servicio se carga dentro de un iframe, si no tiene SameSite=None; secure la cookie no se almacenara en el navegador del usuario
// ref: https://blog.chromium.org/2020/02/samesite-cookie-changes-in-february.html
// en php8 se configura en el .ini, con php7 se puede hacer así: https://stackoverflow.com/questions/59534999/how-to-tell-php-to-use-samesite-none-for-cross-site-cookies
header( 'Set-Cookie: '.session_name().'='.session_id().'; path=/; SameSite=None; secure; HttpOnly' );

// guardamos la informacion en sesion
$_SESSION['datos'] = $datos;

// URL a la cual Ucampus debe redirigir al usuario. Importante que venga con un token para poder retomar la sesion (usando session_id( $_GET['token'] ) )
exit( 'https://URL_A_LA_CUAL_REDIRIGIR_AL_USUARIO?token='.session_id() );