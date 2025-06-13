<?php

namespace Ozmos\Viper\Extractors;

use Ozmos\Viper\PageComponent;
use PhpParser\Node;
use PhpParser\NodeVisitorAbstract;

class PhpPreamble extends NodeVisitorAbstract
{
    public function __construct(
        public string $absolutePath,
    ) {}

    public function leaveNode(Node $node)
    {
        // Detect the "return new class" expression
        if ($node instanceof Node\Stmt\Return_ &&
            $node->expr instanceof Node\Expr\New_ &&
            $node->expr->class instanceof Node\Stmt\Class_) {

            // Replace it with a named class
            $namedClass = $node->expr->class;
            $namedClass->name = new Node\Identifier(PageComponent::componentNameFromPath($this->absolutePath));

            // Return the class as a top-level statement
            return $namedClass;
        }

        return null;
    }
}
