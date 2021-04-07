<?php

$config = json_decode(file_get_contents('config.json'));

// Set up PDO
$pdo = new PDO(
	'mysql:dbname=' . $config->db_database . ';host=' . $config->db_host . ':' . $config->db_port,
	$config->db_username,
	$config->db_password
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Make target directory
if (!file_exists('corpora')) {
	mkdir('corpora');
}

// Get channels
$sql = "
	SELECT `id`
	FROM `channels`
	WHERE `type` = 'text'";
$res = $pdo->query($sql);
$channel_ids = [];
while ($row = $res->fetch(PDO::FETCH_ASSOC)) {
	$channel_ids[] = $row['id'];
}

// Loop through channels
foreach ($channel_ids as $channel_id) {
	// Create file
	$path = 'corpora/' . $channel_id . '.txt';
	$fh = fopen($path, 'w+');
	print "Generating '" . $path . "' for channel #" . $channel_id . "..";

	// Get messages
	$sql = "
		SELECT `content`
		FROM `messages`
		WHERE `channel_id` = :channel_id";
	$stmt = $pdo->prepare($sql);
	$stmt->execute([':channel_id' => $channel_id]);
	$n = 0;
	while ($row = $stmt->fetch()) {
		$n++;
		if (!($n % 1000)) print ".";
		$str = cleanup($row['content']);
		if (!strlen($str)) {
			continue;
		}
		fwrite($fh, $str . "\n");
	}
	fclose($fh);
	print "OK(" . $n . ")\n";
}

/**
 * @param string $str
 * @return string
 */
function cleanup($str) {
	// replace weird quotations
	$str = str_replace('“', '"', $str);
	$str = str_replace('”', '"', $str);

	// remove nontypeable chars
	$str = preg_replace('/[^a-zA-Z0-9\t\n .\/<>?;:"\'`!@#$%^&*()\[\]{}_+=|\\-]/', '', $str);

	// trim newlines
	$str = trim($str, "\r\n");

	return $str;
}
