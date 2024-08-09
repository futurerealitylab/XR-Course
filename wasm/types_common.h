#ifndef TYPES_COMMON_H
#define TYPES_COMMON_H

#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>
//
//extern_link_begin()

//#define ALIGN_AS(ALIGNMENT__) __attribute__((aligned ( ALIGNMENT__ )));
#define MTT_ALIGN(ALIGNMENT__) _Alignas( ALIGNMENT__ )
#define MTT_ALIGN_16() MTT_ALIGN( 16 )

typedef unsigned char uchar;

typedef int8_t   int8;
typedef int16_t  int16;
typedef int32_t  int32;
typedef int64_t  int64;

typedef int8   sint8;
typedef int16  sint16;
typedef int32  sint32;
typedef int64  sint64;

typedef uint8_t  uint8;
typedef uint16_t uint16;
typedef uint32_t uint32;
typedef uint64_t uint64;

typedef float    float32; 
typedef double   float64;

typedef int8     i8;
typedef int16    i16;
typedef int32    i32;
typedef int64    i64;

typedef i8       s8;
typedef i16      s16;
typedef i32      s32;
typedef i64      s64;

typedef uint8    u8;
typedef uint16   u16;
typedef uint32   u32;
typedef uint64   u64;

typedef float32  f32; 
typedef float64  f64;

#if !(OVERRIDE_SIZE_TYPE)
typedef i64 isize;
typedef u64 usize;
typedef i32 isize32;
typedef u32 usize32;
#endif
typedef unsigned char* ucharptr;

typedef uintptr_t uintptr;

typedef const char* const cstring;

typedef void* raw_ptr;


#define bytes(n) (n * 1ull)
#define kb(n) (bytes(n) * 1024ull)
#define mb(n) (kb(n) * 1024ull)
#define gb(n) (mb(n) * 1024ull)

#define BSET_ADD(bits__, index__) bits__ |= (1 << index__)
#define BSET_CONTAINS(bits__, index__) ((bits__ & (1 << index__)) != 0)


#define foreach(i, lim) for (u64 (i) = 0; (i) < ((u64)lim); (i += 1))
#define forrange(i, l, h) for (i64 (i) = (l); (i) < (h); (i += 1))


#define PASTE2(x, y) x##y
#define PASTE(x, y) PASTE2(x, y)
#define STRING_MAKE(str) #str

//extern_link_end()

#endif


//#ifdef TYPES_COMMON_IMPLEMENTATION
//
////extern_link_begin()
////
////extern_link_end()
//
//#undef TYPES_COMMON_IMPLEMENTATION
//
//#endif

