<?php

    $name = isset($_REQUEST['repoName']) ? $_REQUEST['repoName'] : '';
    $branchRoot = __DIR__.'/branches';
    echo $name;
    if($name) {
        $cmd = 'node branches-to-folders.js magic '. $name;
    //    echo 'running command:<br><br>', $cmd, '<br><br>';
        exec($cmd, $out);

    } else {
        $out = array('no repoName given');
    }


    function sendMail() {
        global $name;

        $url = 'http://branches.' . $_SERVER['SERVER_NAME'];

        $to      = 'bogdan.gradinariu@xivic.com, git@xivic.com';
        $subject = '[github project update] ' . $name;
        $message = 'Check this out: ' . $url;
        $headers = 'From: git@xivic.com' . "\r\n" .
        'Reply-To: bogdan.gradinariu@xivic.com' . "\r\n" .
        'X-Mailer: PHP/' . phpversion();

        echo $to, $subject, $message, $headers;
        echo '<br> send: ', mail($to, $subject, $message, $headers);
    }


    sendMail();
//    var_dump($out);

