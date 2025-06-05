<?php

namespace Ozmos\Viper\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Ozmos\Viper\PageComponent;
use PhpParser\Node;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitorAbstract;
use PhpParser\ParserFactory;
use PhpParser\PhpVersion;
use PhpParser\PrettyPrinter\Standard;

class CompileCommand extends Command
{
    protected $signature = 'viper:compile {--filename=} {--write=true} {--transform=true} {--output';

    protected $description = 'Compiles the php contents of a vue file';

    public function handle()
    {
        $parser = (new ParserFactory)->createForVersion(PhpVersion::getHostVersion());

        // take absolute path read vue file extract php write compiled output
        $phpContent = $this->getContent()->prepend('<?php'.PHP_EOL.PHP_EOL.'namespace ViperGen;'.PHP_EOL.PHP_EOL);

        $relativePath = str($this->option('filename'))->replaceStart(config('viper.pages_path'), '')->replaceStart('/', '')->replaceEnd('.vue', '')->replaceEnd('.php', '');

        $compiledPath = config('viper.output_path').'/compiled/'.$relativePath.'.php';

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

        if ($this->option('write') === 'true') {
            File::ensureDirectoryExists(dirname($compiledPath));
            File::put($compiledPath, $final);
            echo 'Compiled '.$relativePath;
            if ($this->option('transform') === 'true') {
                Artisan::call('viper:generate');
            }
        } else {
            $this->line($final);
        }

        return Command::SUCCESS;
    }

    public function getContent()
    {
        if (config('viper.mode') === 'sfc') {
            $componentFile = File::get($this->option('filename'));

            return str($componentFile)->match('/<php>([\s\S]*?)<\/php>/s');
        }

        $filename = str($this->option('filename'))->replaceEnd('.vue', '.php');
        if (! File::exists($filename)) {
            return str('');
        }
        $componentFile = File::get($filename);

        return str($componentFile)->replaceStart('<?php', '');
    }
}
