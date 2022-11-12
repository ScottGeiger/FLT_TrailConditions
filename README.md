# FLT_TrailConditions

React implementation of FLT Trail Conditions

## Usage:

The following Query String parameters can be used:
  * `sortBy=[map | date]`; sort notices by map or date
  * `archive=[new | old]`; hide or show archived notices
  * `show=[{map} | {special}]`; show only a specific map or special condition
  * `hidenav`; hide the top navigation menu *(useful for pop-up windows)*
  * `#{map}`; using the hash/fragment will scroll to the map

## Special Show Map Options:
  * All Closures: `show=closure`
  * Hunting Closures: `show=hunting`
  * Non-Hunting Closures: `show=non-hunting`
  * Map Revisions: `show=rev-notice`
  * Temporary Notices: `show=temp-notice`

## Examples:

Default View: 
  * `sortBy=map&archive=new`

Sort By Date: 
  * `sortBy=date&archive=new`

Show Old/Archived Notices: 
  * `sortBy=map&archive=old`
  * `sortBy=date&archive=old`

Show Map M15:
  * `show=M15`
  * `show=m15`

Show Map M1/CT1:
  * `show=M1_CT1`
  * `show=M1/CT1`
  * `show=m1_ct1`
  * `show=m1/ct1`

Show Map M18 Without Navigation Menu:
  * `show=m18&hidenav`
  * `show=m18&hidenav=true`

Hash/Fragment:
  * `sortBy=map&archive=new#M15`
  * `sortBy=map&archive=new#m15`
  * `#M15`
  * `#m15`
  