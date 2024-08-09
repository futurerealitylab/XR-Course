#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

#define EXPOSE_API EMSCRIPTEN_KEEPALIVE

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <math.h>

#define MTT_print(...) printf(__VA_ARGS__)
#define MTT_error(...) printf(__VA_ARGS__)
#define ASSERT_MSG(...)


#define TYPES_32_BIT
#include "types_common.h"

extern "C" {

#define USE_ALIGNED_MEMORY_ALLOCATION
#include "mtt_core_platform.hpp"





}

#define MATHEMATICS_LOCAL_INCLUDE
#define GLM_FORCE_DEPTH_ZERO_TO_ONE

#define MATHEMATICS_DONT_USE_ALIGNED

#include "mathematics.h"

#include "memory.hpp"
#include "array.hpp"

static inline void u32_print(uint32 v)
{
	printf("%u", v);
}
static inline void i32_print(int32 v)
{
	printf("%d", v);
}
static inline void i64_print(int64 v)
{
	printf("%lld", v);
}

static inline void f32_print(float32 v)
{
	printf("%f", v);
}
static inline void v2_print(float32* v)
{
	printf("(v2) { %f, %f }", v[0], v[1]);
}
static inline void v3_print(float32* v)
{
	printf("(v3) { %f, %f, %f }", v[0], v[1], v[2]);
}
static inline void v4_print(float32* v)
{
	printf("(v4) { %f, %f, %f, %f }", v[0], v[1], v[2], v[3]);
}
static inline void print_endl(void)
{
	printf("\n");
}