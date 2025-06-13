<?php

namespace Ozmos\Viper;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use PhpParser\Node;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitorAbstract;
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

        // take absolute path read vue file extract php write compiled output
        $phpContent = $this->getContent()->prepend('<?php'.PHP_EOL.PHP_EOL.'namespace ViperGen;'.PHP_EOL.PHP_EOL);

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

        $traverser = new NodeTraverser;
        $instance = new class extends NodeVisitorAbstract
        {
            protected $compiledPath;

            public function setPath($path)
            {
                $this->compiledPath = $path;
            }

            public function leaveNode(Node $node)
            {
                // Detect the "return new class" expression
                if ($node instanceof Node\Stmt\Return_ &&
                    $node->expr instanceof Node\Expr\New_ &&
                    $node->expr->class instanceof Node\Stmt\Class_) {

                    // Replace it with a named class
                    $namedClass = $node->expr->class;
                    $namedClass->name = new Node\Identifier(PageComponent::componentNameFromPath($this->compiledPath));

                    // Return the class as a top-level statement
                    return $namedClass;
                }

                return null;
            }
        };
        $instance->setPath($relativePath);
        $traverser->addVisitor($instance);

        $modifiedAst = $traverser->traverse($ast);

        $prettyPrinter = new Standard;
        $final = $prettyPrinter->prettyPrintFile($modifiedAst);

        File::ensureDirectoryExists(dirname($compiledPath));
        File::put($compiledPath, $final);

        return $final;
    }

    public function getContent()
    {
        if (app(ViperConfig::class)->isSfc()) {
            $componentFile = File::get($this->filename);

            if (app(ViperConfig::class)->isReact()) {
                $pattern = '/export\s+const\s+php\s*=\s*\/\*\*\s*@php\s*\*\/\s*`\s*(.*?)\s*`;/s';

                return str($componentFile)->match($pattern);
            }

            return str($componentFile)->match('/<php>([\s\S]*?)<\/php>/s');
        }

        $extension = pathinfo($this->filename, PATHINFO_EXTENSION);

        $filename = str($this->filename)->replaceEnd('.'.$extension, '.php');
        if (! File::exists($filename)) {
            return str('');
        }
        $componentFile = File::get($filename);

        return str($componentFile)->replaceStart('<?php', '');
    }
}
