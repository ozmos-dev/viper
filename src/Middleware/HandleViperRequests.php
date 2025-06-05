<?php

namespace Ozmos\Viper\Middleware;

use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HandleViperRequests
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($request->header('x-viper-request') !== 'true') {
            return $response;
        }

        if ($response instanceof RedirectResponse) {
            return response()->noContent()->header('X-Viper-Location', $response->getTargetUrl());
        }

        return $response;
    }
}
