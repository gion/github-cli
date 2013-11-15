<?php
var_dump($_GET);

    $name = isset($_REQUEST['repoName']) ? $_REQUEST['repoName'] : '';
    $branchRoot = __DIR__.'/branches';
    echo $name;
    if($name) {
        $cmd = 'node branches-to-folders.js magic '. $name;
        echo 'running command:<br><br>', $cmd, '<br><br>';
        exec($cmd, $out);

    } else {
        $out = array('no repoName given');
    }

    print_r($out);
