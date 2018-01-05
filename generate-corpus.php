<?php

$config = json_decode(file_get_contents('config.json'));

$pdo = new PDO(
  'mysql:dbname=' . $config->db_database . ';host=' . $config->db_host,
  $config->db_username,
  $config->db_password
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$sql = "
  SELECT `id`
  FROM `users`
  WHERE `username` = 'dudebot'";
$row = $pdo->query($sql)->fetch();
$my_id = $row['id'];

$fh = fopen('corpus.txt', 'w+');
$sql = "
  SELECT `content`
  FROM `messages`
  WHERE `user_id` != :my_id";
$stmt = $pdo->prepare($sql);
$stmt->execute([':my_id' => $my_id]);
while ($row = $stmt->fetch()) {
  $str = cleanup($row['content']);
  if (!strlen($str)) {
    continue;
  }
  fwrite($fh, $str . "\n");
}
fclose($fh);

/**
 * @param string $str
 * @return string
 */
function cleanup($str)
{
  // replace weird quotations
  $str = str_replace('“', '"', $str);
  $str = str_replace('”', '"', $str);

  // remove nontypeable chars
  $str = preg_replace('/[^a-zA-Z0-9\t\n .\/<>?;:"\'`!@#$%^&*()\[\]{}_+=|\\-]/', '', $str);

  // trim newlines
  $str = trim($str, "\r\n");

  return $str;
}
