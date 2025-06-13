<?php

namespace Ozmos\Viper;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Ozmos\Viper\Extractors\PhpExtractor;
use Ozmos\Viper\Extractors\PhpPreamble;
use PhpParser\NodeTraverser;
use PhpParser\ParserFactory;
use PhpParser\PhpVersion;
use PhpParser\PrettyPrinter\Standard;

class Compiler
{
    public function __construct(
        public string $filename,
        public bool $write = true,
    ) {}

    public function compile()
    {
        $parser = (new ParserFactory)->createForVersion(PhpVersion::getHostVersion());

        $phpContent = str(app(PhpExtractor::class)->extract($this->filename))->prepend('<?php'.PHP_EOL.PHP_EOL.'namespace ViperGen;'.PHP_EOL.PHP_EOL);

        $extension = pathinfo($this->filename, PATHINFO_EXTENSION);

        $relativePath = str($this->filename)->replaceStart(app(ViperConfig::class)->pagesPath(), '')->replaceStart('/', '')->replaceEnd('.'.$extension, '');

        $compiledPath = app(ViperConfig::class)->outputPath('compiled/'.$relativePath.'.php');

        try {
            $ast = $parser->parse($phpContent);
        } catch (\PhpParser\Error $e) {
            $obj = [
                'message' => $e->getMessage(),
                // todo: provide accurate line / stack trace
            ];
            fwrite(STDERR, json_encode($obj).PHP_EOL);

            return Command::FAILURE;
        }

        $final = $this->addRequiredPhpPreamble($relativePath, $ast);

        if ($this->write) {
            File::ensureDirectoryExists(dirname($compiledPath));
            File::put($compiledPath, $final);
        }

        return $final;
    }

    private function addRequiredPhpPreamble(string $relativePath, array $ast)
    {
        $traverser = new NodeTraverser;
        $instance = new PhpPreamble($relativePath);
        $traverser->addVisitor($instance);

        $modifiedAst = $traverser->traverse($ast);

        $prettyPrinter = new Standard;

        return $prettyPrinter->prettyPrintFile($modifiedAst);
    }
}
